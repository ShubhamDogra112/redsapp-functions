const {db , admin} = require("../utils/admin")
const firebase = require("firebase")
const firebaseConfig = require("../utils/config")
const {reduceuserDetails} = require("../middlewares/userDetails")
firebase.initializeApp(firebaseConfig);




const IsEmail = (email)=>{
    var reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(reg)) return true;
    else return false

}

const isEmpty = (value)=>{
    if (value.trim() === ""){
        return true
    }
    else{
        return false
    }
}



exports.signup = (req,res,next)=>{
    const newUser = {
        email : req.body.email,
        password : req.body.password,
        confirmPassword : req.body.confirmPassword,
        handle:req.body.handle

    }

    let img = 'no-image.png'

    

    // validate the data
    let errors = {}
    if(isEmpty(newUser.email)){
        errors.email = "Email must not be empty"
    }
    else if(!IsEmail(newUser.email)){
        errors.email = "Must be a valid email"
    }


     if(isEmpty(newUser.password)){
        errors.password = "password must not be empty"
    }

    if(newUser.password !== newUser.confirmPassword){
        errors.confirmPassword = "Passwords Dont Match"
    }

    if(isEmpty(newUser.handle)){
        errors.handle = "Handle must not be empty"
    }

    if(Object.keys(errors).length >0){
        return res.status(400).json({
            errors:errors
        })
    }

// validation ends  

let token;
let userId;

    db.doc(`/user/${newUser.handle}`).get()
        .then(doc=>{
            if(doc.exists){
              return  res.status(400).json({
                    message:'This Handle is already taken'
                })

            }
            else{ 
                
            return firebase.auth().createUserWithEmailAndPassword(newUser.email , newUser.password);
    
            }
        })
        .then(data=>{
            console.log(data.user)
            userId = data.user.uid
            return data.user.getIdToken();
        })
        .then(idToken=>{
            token = idToken;

            const usercredentials = {
                handle:newUser.handle,
                userId:userId,
                createdAt:new Date().toISOString(),
                email:newUser.email,
                imgUrl:`https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${img}?alt=media`
            }

            db.doc(`/user/${newUser.handle}`).set(usercredentials)
        })
        .then(()=>{
            return res.status(201).json({
                message:`user created successfully`,
                token:token
                })

           })

        .catch(err=>{
            console.error(err)
            return res.status(500).json({
                general:"Something went wrong please try again ",
                message:err.message
                })
        })
}

exports.login = (req,res,next)=>{

    const user = {
        email:req.body.email,
        password:req.body.password
    }

       // validate the data
       let errors = {}
       if(isEmpty(user.email)){
           errors.email = "Email must not be empty"
       }

       if(isEmpty(user.password)){
        errors.password = "password must not be empty"
    }

    if(Object.keys(errors).length >0){
        return res.status(400).json({
            errors:errors
        })
    }

    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
        .then(data=>{
            console.log(data.user)
            return data.user.getIdToken()
        })
        .then(token=>{
            res.status(201).json({
                message:"successfully logged in",
                token:token
            })
        })

        .catch(err=>{
            return res.status(401).json({
                message:err.message,
                general:'Wrong credentials please try again'
            })
        })


}

exports.uploadImage = (req,res,next)=>{
    
    const Busboy = require('busboy')
    const path = require('path')
    const fs = require('fs')
    const os = require('os')
    let imgUrl;
    // const screamDocument = db.collection('screams').where('userHandle','==',req.user.handle)
    // const commentDocument = db.collection('comments').where('userHandle','==',req.user.handle)


    let imageFileName;
    let imageToBeUploaded ={};

    const busboy = Busboy({
        headers:req.headers
    })

    busboy.on('file' , (fieldname , file , filename , encoding , mimeType)=>{

        if(mimeType != 'image/jpeg' && mimeType != 'image/png' && mimeType != 'image/jpg'){
            return res.status(400).json({message:'Wrong file type submited'})
        }

        const imageExtension = filename.split(".")[filename.split(".").length -1]

        imageFileName = `${Math.round(Math.random()*100000000000)}.${imageExtension}`

        let filePath = path.join(os.tmpdir() , imageFileName)

        imageToBeUploaded = {filePath , mimeType};

        file.pipe(fs.createWriteStream(filePath))



    })

    busboy.on('finish' , ()=>{

        admin.storage().bucket().upload(imageToBeUploaded.filePath , {
            resumable:false,
            metadata:{
                metadata:{
                    contentType:imageToBeUploaded.mimeType
                }
            }
        })
        .then(()=>{
            
             imgUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`
             return db.doc(`/user/${req.user.handle}`).update({imgUrl})
        })
        
        .then(()=>{
         return   res.status(201).json({
                message:"image uploaded Successfully"
            })
        })
        .catch(err=>{
            console.error(err)
            res.json({
                message:err.message
            })
        })

    })

    busboy.end(req.rawBody)
}

exports.addUserDetails = (req,res,next)=>{

    let userDetails = reduceuserDetails(req.body)

    db.doc(`/user/${req.user.handle}`).update(userDetails)
        .then(()=>{
            return res.status(201).json({
                message:"Details added succesfully"
            })
        })
        .catch(err=>{
            console.error(err)

            return res.status(400).json({
                message:err.message
            })
        })
    
}


// get any user details
exports.getuserDetails = (req,res)=>{
    let userDetails = {}

    db.doc(`/user/${req.params.handle}`).get()

    .then(doc=>{
        if(!doc.exists){
            return res.status(404).json({
                message:"user not found"
            })
        }
        userDetails.credentials = doc.data()

        return db.collection('screams').where('userHandle','==',req.params.handle).orderBy('createdAt','desc')
                .get()
    })
    .then(data=>{
        userDetails.screams = []
        data.forEach(doc=>{
            userDetails.screams.push({
                body:doc.data().body,
                createdAt:doc.data().createdAt,
                likeCount:doc.data().body,
                commentCount:doc.data().commentCount,
                userHandle:doc.data().userHandle,
                screamId:doc.id,
                userImage:doc.data().imgUrl,

            })

        })

        return res.json(userDetails)
    })
    .catch(err=>{
        console.error(err)
        res.json({
            message:err.message
        })
    })
}



// get authenticated user details
exports.getAuthenticatedUserDetails =(req,res,next)=>{

    let userData = {}

    db.doc(`/user/${req.user.handle}`).get()
        .then(doc=>{
            if(!doc.exists){
                return res.status(404).json({
                    meassage:"No user exist"
                })
            }
            userData.credentials = doc.data()

            return db.collection('likes').where('userHandle','==' , req.user.handle).get()
        })

        .then(data=>{

            userData.likes = []

            data.forEach(doc=>{
                userData.likes.push({
                    likeId:doc.id,
                    screamId:doc.data().screamId,
                    userHandle:doc.data().userHandle
                })

            })

        return db.collection('notifications').where("recipient" ,'==' , req.user.handle)
                .orderBy('createdAt','desc').limit(10).get()

        })
        .then(data=>{
            userData.notifications = []
            data.forEach(doc=>{
                userData.notifications.push({
                    recipient:doc.data().recipient,
                    sender:doc.data().sender,
                    createdAt:doc.data().createdAt,
                    type:doc.data().type,
                    read:doc.data().read,
                    screamId:doc.data().screamId,
                    notificationId:doc.id,

                })
            })

            return res.json(userData)
        })
        .catch(err=>{
            console.error(err)
            res.json({
                message:err.message
            })
        })

}

exports.markNotificationsRead= (req,res)=>{
    let batch = db.batch()

    req.body.forEach(notificationId=>{

        const notification = db.doc(`/notifications/${notificationId}`)
        

        batch.update(notification,{read:true})
    })

    batch.commit()
    .then(()=>{
        return res.json({
            message:"Notifications marked read"
        })
    })
    .catch(err=>{
        console.error(err)
        res.json({
            message:err.message
        })
    })
}