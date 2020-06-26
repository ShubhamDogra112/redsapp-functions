const {db} = require('../utils/admin')


const isEmpty = (value)=>{
    if (value.trim() === ""){
        return true
    }
    else{
        return false
    }
}


exports.reduceuserDetails = (data)=>{

    userDetails = {}

    if(!isEmpty(data.bio))  userDetails.bio = data.bio;

    if(!isEmpty(data.jobTitle))  userDetails.jobTitle = data.jobTitle;


    if(!isEmpty(data.contactNo))  userDetails.contactNo = data.contactNo;


    if(!isEmpty(data.location)) userDetails.location = data.location

    if(!isEmpty(data.website)){

        // https://abc.com
        if(data.website.trim().substring(0,4) !== 'http'){
            userDetails.website = `http://${data.website.trim()}`
        }
        else{
            userDetails.website = data.website.trim()
        }
    }

    return userDetails


}