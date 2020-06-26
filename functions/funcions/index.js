const functions = require("firebase-functions");
const { admin } = require("./utils/admin");
const { db } = require("./utils/admin");
const express = require("express");
const app = express();
const firebase = require("firebase");
const {
  getAllScreams,
  createScream,
  getScream,
  createComment,
  likeScream,
  unlikeScream,
  deleteScream,
} = require("./Controllers/screams");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUserDetails,
  getuserDetails,
  markNotificationsRead
} = require("./Controllers/user");
const { isAuth } = require("./middlewares/auth");
const cors = require('cors')


app.use(cors())

// screams routes
app.get("/screams", getAllScreams);
app.post("/createScream", isAuth, createScream);
app.get("/scream/:id", getScream);
app.post("/scream/:id/comment", isAuth, createComment);
app.get("/scream/:id/like", isAuth, likeScream);
app.get("/scream/:id/unlike", isAuth, unlikeScream);
app.delete("/scream/:id/", isAuth, deleteScream);

// user route
app.post("/signUp", signup);
app.post("/login", login);
app.post("/user", isAuth, addUserDetails);
app.post("/user/upload", isAuth, uploadImage);
app.get("/user", isAuth, getAuthenticatedUserDetails);
app.get("/user/:handle",  getuserDetails)
app.post("/notifications",isAuth ,markNotificationsRead)

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
  .firestore.document('/likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists && doc.data().userHandle !== snapshot.data().userHandle ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });


exports.deleteNotificationOnUnLike = functions
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });


exports.createNotificationOnComment = functions
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists && doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

  exports.onUserImageChange = functions.firestore.document('/user/{userId}')
    .onUpdate(change=>{
      let batch  = db.batch()

      if(change.before.data().imgUrl !== change.after.data().imgUrl){

        return db.collection('screams').where("userHandle" , '==' , change.before.data().handle).get()
        .then(data=>{
  
          data.forEach(doc=>{
  
            const scream = db.doc(`/screams/${doc.id}`)
            batch.update(scream , {imgUrl:change.after.data().imgUrl})
          })

        return db.collection('comments').where("userHandle" , '==' , change.before.data().handle).get()
        
  
        })
        .then(data=>{
  
          data.forEach(doc=>{
  
            const comment = db.doc(`/comments/${doc.id}`)
            batch.update(comment , {imgUrl:change.after.data().imgUrl})
          })

        return batch.commit()
        
  
        })
        .catch(err=>{
          console.error(err)
          return
        })

      }
      else return true
     
    })


    exports.onScreamDelete = functions.firestore.document('/screams/{screamId}')
    .onDelete((snapshot,context)=>{
      const screamId = context.params.screamId
      const batch = db.batch()

      return db.collection('comments').where('screamId' , '==' ,screamId).get()
      .then(data=>{
        data.forEach(doc=>{
          batch.delete(db.doc(`/comments/${doc.id}`))
        })

      return db.collection('likes').where('screamId' , '==' ,screamId).get()

      })
      .then(data=>{
        data.forEach(doc=>{
          batch.delete(db.doc(`/likes/${doc.id}`))
        })

      return db.collection('notifications').where('screamId' , '==' ,screamId).get()

      })
      .then(data=>{
        data.forEach(doc=>{
          batch.delete(db.doc(`/notifications/${doc.id}`))
        })

      return batch.commit()

      })
      .catch(err=>{
        console.error(err)
        return
      })

      
    })