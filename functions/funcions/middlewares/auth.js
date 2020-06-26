const {admin , db} = require("../utils/admin")

 
exports.isAuth = (req,res,next)=>{

    let token
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){

         token = req.headers.authorization.split("Bearer ")[1]
        


    }
    else{
        return res.status(403).json({
            message:"Unauthorized"
        })
    }

    
    admin.auth().verifyIdToken(token)
        .then(decodedtoken=>{

            req.user = decodedtoken

            return db.collection('user')
                    .where('userId', '==', req.user.uid)
                    .limit(1)
                    .get()

        })
        .then(data=>{
            req.user.handle = data.docs[0].data().handle
            req.user.imgUrl = data.docs[0].data().imgUrl
            
            return next()
        })
        .catch(err=>{
            console.error(err)
            res.status(403).json({
                message:err.message
            })
        })

}

