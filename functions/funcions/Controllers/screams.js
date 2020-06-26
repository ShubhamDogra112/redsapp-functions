const { db } = require("../utils/admin");
const unicode = require("emoji-unicode")
const emoji_name = require("emoji-name-map")

const isEmpty = (value) => {
  if (value.trim() === "") {
    return true;
  } else {
    return false;
  }
};

exports.getAllScreams = async (req, res, next) => {

try{
  let data = await  db.collection("screams").orderBy("createdAt", "desc").get()
  let screams = [];
        data.forEach((doc) => {
          screams.push({
            id: doc.id,
            userHandle: doc.data().userHandle,
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            commentCount:doc.data().commentCount,
            likeCount:doc.data().likeCount,
            imgUrl:doc.data().imgUrl
          });
        });
        return res.json(screams);
  }
  catch(err){
    console.error(err)
    res.json({
      message:err.message
    })

  }
};

// creating a scream

exports.createScream = (req, res, next) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({
      message: "Scream cant be empty",
    });
  }

  // let smiley = emoji_name.get('heart')


  const newScream = {
    body:req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    imgUrl: req.user.imgUrl,
    commentCount: 0,
    likeCount: 0,
  };
  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      res.json({
        message: `document ${doc.id} created successfully`,
        id:doc.id
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Something went wrong",
      });
      console.error(err);
    });
};


// deleting a scream
exports.deleteScream = async (req,res,next)=>{
  const screamDocument = db.doc(`/screams/${req.params.id}`)
  // const commentDocument  = db.collection('comments').where('screamId','==',req.params.id)
  // const likeDocument = db.collection('likes').where('screamId' , '==' , req.params.id)

  screamDocument.get()
  .then(doc=>{

    if(!doc.exists){
     return res.status(404).json({
        message:'Scream Not found'
      })

    }

    if(doc.data().userHandle !== req.user.handle){
     return res.status(403).json({
        message:'You are not authorized to do the same'
      })
    }

      return screamDocument.delete()
    
  })
  
  .then(()=>{
    res.status(201).json({
      message:'Scream deleted successfully'
    })
  })
  .catch(err=>{
    console.error(err)
    res.json({
      message:err.message
    })
  })
}


// fetching scream data

exports.getScream = (req, res) => {
  let screamData = {};

  db.doc(`/screams/${req.params.id}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({
          message: "Scream not exist",
        });
      }

      screamData = doc.data();
      console.log(req.params.id);

      return db
        .collection("comments")
        .where("screamId", "==", req.params.id)
        .orderBy("createdAt")
        .get();
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });

      return res.json(screamData);
    })
    .catch((err) => {
      console.error(err);
      res.json({
        message: err.message,
      });
    });
};

// comment on a scream controllers
exports.createComment = (req, res, next) => {
  if (isEmpty(req.body.body)) {
    return res.status(400).json({
      message: "Must not be empty",
    });
  }

  const newComment = {
    body: req.body.body,
    screamId: req.params.id,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    imgUrl: req.user.imgUrl,
  };

  db.doc(`/screams/${req.params.id}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.json({
          message: "Scream not found",
        });
      }

      return doc.ref.update({commentCount:doc.data().commentCount+1})
    })
    .then(()=>{
      return db.collection('comments').add(newComment)
    })
    .then(() => {
      res.status(201).json({
        message: "Comment created successfully",
      });
    })
    .catch((err) => {
      console.error(err);
      res.json({
        message: err.message,
      });
    });
};


// like document

exports.likeScream = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.id)
    .limit(1);

  const screamDocument = db.doc(`/screams/${req.params.id}`);

  let screamdata = {};

  screamDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({
          message: "Scream not found",
        });
      }

      screamData = doc.data();
      screamData.screamId = doc.id;

      return likeDocument.get();
    })

    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            userHandle: req.user.handle,
            screamId: req.params.id,
          })

          .then(() => {
            screamData.likeCount += 1;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          
          .then(() => {
            return res.json(screamData);
          })

      } else {
        return res.status(400).json({
          message: "Scream already liked",
        });
      }
    })
    .catch((err) => {
      console.error(err);
      res.json({
        message: err.message,
      });
    });
};


// unlike the documnet

exports.unlikeScream = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.id)
    .limit(1);

  const screamDocument = db.doc(`/screams/${req.params.id}`);

  let screamdata = {};

  screamDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({
          message: "Scream not found",
        });
      }

      screamData = doc.data();
      screamData.screamId = doc.id;

      return likeDocument.get();
    })

    .then((data) => {
      if (data.empty) {

        return res.status(400).json({
          message: "Scream not liked",
        });

       
      } else {

        return db.doc(`/likes/${data.docs[0].id}`).delete()

        .then(()=>{

          screamData.likeCount -=1;
          return screamDocument.update({likeCount:screamData.likeCount})
        })

        .then(() => {
          return res.json(screamData);
        })
    }

  })
  .catch((err) => {
      console.error(err);
      res.json({
        message: err.message,
      });
    });
};
