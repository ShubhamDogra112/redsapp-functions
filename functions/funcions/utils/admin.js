const admin = require("firebase-admin")
const serviceAccount = require('../redsapp-d5e82-firebase-adminsdk-db3v7-4748d66d0a.json')


admin.initializeApp({

    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://redsapp-d5e82.firebaseio.com",
    storageBucket: "redsapp-d5e82.appspot.com"

  
  })
  
  const db = admin.firestore()

  module.exports = {admin , db}