/* eslint-disable quotes */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable global-require */
module.exports = function (app, validateToken, checkBodyForValidAttributes) {
  const mongoose = require('mongoose');
  const Schemata = require('../../models/user');
  const Document = require('../../models/document');
  const User = mongoose.model('user', Schemata.User);
 

  // send array of all institutions of current user
  app.get('/institutions', validateToken, (req, res) => {
    console.log(res.locals.user.institutions);
    res.send({ institutions: res.locals.user.institutions });
  });

  // creates institution for current user
  app.post('/createInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
    const query = { _id: res.locals.user._id };
    const newInstitution = req.body.institution;
    const institutionsArray = res.locals.user.institutions;
    let insitutionIsUnique = true;

    institutionsArray.forEach((institution) => {
      if (institution === newInstitution) {
        insitutionIsUnique = false;
      }
    });

    if (insitutionIsUnique) {
      institutionsArray.push(newInstitution);
      // console.log("Institution: " + newInstitution + " was created");
      // console.log("This is the new institutionsArray: " + institutionsArray);
      User.findOneAndUpdate(query, { institutions: institutionsArray }, { upsert: false }, (err) => {
        if (err) {
          console.log(err);
        } else {
          res.sendStatus(200);
        }
      });
    } else {
      res.status(400).json({ error: "Please enter a unique institution" });
    }
  });

  // deletes institution from current user and from all documents where it is used in
  app.post('/deleteInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
    const query = { _id: res.locals.user._id };
    const institutionToDelete = req.body.institution;
    const institutionsArray = res.locals.user.institutions;
    let institutionFound = false;
    let positionFound = null;
    for (let i = 0; i < institutionsArray.length; i += 1) {
      // console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
      if (institutionsArray[i] === institutionToDelete) {
        institutionFound = true;
        positionFound = i;
        break;
      }
    }
    // console.log(institutionFound);
    // console.log(positionFound);
    if (institutionFound && positionFound !== null) {
      institutionsArray.splice(positionFound, 1);
      console.log(institutionsArray);
      console.log(res.locals.user.institutions);
      User.findOneAndUpdate(query, { institutions: institutionsArray }, { upsert: false }, (err) => {
        if (err) {
          res.status(500).json({ error: err });
        } else {
          // delete institution from documents
          // get all docs with username ...
          const userQuery = { user: res.locals.user._id };
          Document.find(userQuery, (er, docs) => {
            if (er) {
              console.log("User has no documents");
            } else {
              console.log(docs);
              // get all docs with institution in array
              docs.forEach((doc) => {
                const newInstitutionsArray = doc.institution;
                let institutionFoundInArray = false;
                let positionFoundInArray = null;

                for (let i = 0; i < newInstitutionsArray.length; i += 1) {
                  // console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
                  if (newInstitutionsArray[i] === institutionToDelete) {
                    institutionFoundInArray = true;
                    positionFoundInArray = i;
                    break;
                  }
                }
                if (institutionFoundInArray && positionFoundInArray !== null) {
                  newInstitutionsArray.splice(positionFoundInArray, 1);
                  // replace
                  const documentQuery = { _id: doc._id };
                  Document.findOneAndUpdate(documentQuery, { institution: newInstitutionsArray }, { upsert: false }, (error) => {
                    if (error) {
                      console.error(error);
                    }
                  });
                }
              });
            }
          });
          res.sendStatus(200);
        }
      });
    } else {
      res.sendStatus(400);
    }
  });

  // adds insitution(given by name) to document given by id
  app.post('/addInstitutionToDocument', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution', 'documentID']), validateToken, (req, res) => {
    const id = req.body.documentID;
    Document.findById(id, 'institution', (err, document) => {
      if (err || document == null) {
        // console.log('Error getting document by id');
        res.status(404).json({ error: "This id is not associated with any existing document" });
      } else {
        console.log(document);
        const institutionToAdd = req.body.institution;
        const institutionsArray = document.institution;
        let institutionFound = false;
        for (let i = 0; i < institutionsArray.length; i += 1) {
          // console.log("Comparing "+ institutionsArray[i] + " to " + institutionToAdd);
          if (institutionsArray[i] === institutionToAdd) {
            institutionFound = true;
            break;
          }
        }
        if (institutionFound) {
          res.sendStatus(400);
        } else {
          const query = { _id: id };
          institutionsArray.push(institutionToAdd);
          console.log(institutionsArray);
          Document.findOneAndUpdate(query, { institution: institutionsArray }, { upsert: false }, (er, doc) => {
            if (er) {
              res.status(500).json({ error: er });
            } else {
              console.log(doc);
              res.sendStatus(200);
            }
          });
        }
      }
    });
  });

  // deletes institution(given by name) from document given by id
  app.post('/deleteInstitutionFromDocument', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution', 'documentID']), validateToken, (req, res) => {
    const id = req.body.documentID;
    Document.findById(id, 'institution', (err, document) => {
      if (err) {
        // console.log('Error getting document by id');
        res.sendStatus(404);
      } else {
        console.log(document);
        const institutionToDelete = req.body.institution;
        const institutionsArray = document.institution;
        let institutionFound = false;
        let indexFound = null;

        for (let i = 0; i < institutionsArray.length; i += 1) {
          // console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
          if (institutionsArray[i] === institutionToDelete) {
            institutionFound = true;
            indexFound = i;
            break;
          }
        }
        if (institutionFound && indexFound !== null) {
          institutionsArray.splice(indexFound, 1);
          const query = { _id: id };
          Document.findOneAndUpdate(query, { institution: institutionsArray }, { upsert: false }, (er, doc) => {
            if (er) {
              res.status(500).json({ error: er });
            } else {
              console.log(doc);
              res.sendStatus(200);
            }
          });
        } else {
          res.status(400);
        }
      }
    });
  });
};
