/* eslint-disable no-underscore-dangle */
/* eslint-disable no-else-return */
/* eslint-disable no-useless-return */
/* eslint-disable quotes */
/* eslint-disable max-len */
/* eslint-disable global-require */
module.exports = (app, validateToken, checkBodyForValidAttributes) => {
  const mongoose = require('mongoose');
  const Document = require('../../models/document');
  const fs = require('fs-extra');
  const merge = require('easy-pdf-merge');
  const path = require('path');

  let currentFile = null;
  let currentFileCount = 0;

 
  // makes database entry for document, futher JSDocs omitted for sake of simplicity
  function makedbEntry(yearvar, monthvar, institutionvar, importancevar, descriptionvar, titlevar, filePathvar, userIDvar) {
    const doc = new Document({
      year: yearvar,
      month: monthvar,
      institution: institutionvar,
      importance: importancevar,
      description: descriptionvar,
      filePath: filePathvar,
      title: titlevar,
      user: userIDvar,
    });
    // console.log(user);
    console.log(filePathvar);
    doc.save((err, savedDocument) => {
      if (err) {
        console.log('Error adding to DB');
      } else {
        console.log('Successfully saved doc to db');
      }
      console.log(savedDocument);
    });
  }

  // deletes every document which id was specified in idArray forom database
  function deleteDocumentsFromDB(idArray) {
    let NoError = true;
    // console.log("This is the id array " + idArray);
    idArray.forEach((id) => {
      Document.deleteOne({ _id: id }, (err) => {
        if (err) {
          console.log(err);
          NoError = false;
        }
      });
      // console.log("Document " + id + " has been deleted from db");
    });
    return NoError;
  }
  // deletes every file which path was specified in pathArray form filesystem
  function deleteDocumentsFromFS(pathArray) {
    let noError = true;
    pathArray.forEach((filePath) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          noError = false;
        } else {
          // console.log("File at " + filePath + " has been deleted");
        }
      });
    });
    return noError;
  }

  // generates a filename from filePrefix and ensures uniqueness
  // by checking and adding an integer at the end if needed
  function generateFilename(dirPath, filePrefix) {
    let generatedFilename = null;
    const files = fs.readdirSync(dirPath);

    let newFilename = `${filePrefix}.pdf`;
    let foundDuplicate = false;
    for (let a = 0; a < 1000; a += 1) {
      foundDuplicate = false;
      // newFilename = filePrefix + '.pdf';
      if (a > 0) {
        newFilename = `${filePrefix + a}.pdf`;
      }
      // eslint-disable-next-line no-loop-func
      files.forEach((filename) => {
        // console.log('Comparing ' + filename + ' to ' + newFilename);
        if (filename === newFilename) {
        // console.log('duplicate found');
          foundDuplicate = true;
        }
      });
      if (!foundDuplicate) {
        break;
      }
    }
    generatedFilename = dirPath + newFilename;
    console.log(generatedFilename);
    return generatedFilename;
  }
  const port = process.env.PORT || 3000;

  function isLocal() {
    if (port === 3000) {
      return true;
    } else {
      return false;
    }
  }

  // send specifications of all documents
  app.get('/documents', validateToken, async (req, res) => {
  // console.log(res.locals.user);
  // promise to get all entrys from db and add them to an array, then merge to json obj
    const infoArray = await new Promise((resolve, reject) => {
      Document.find({}, (err, documents) => {
        if (err) {
          res.status(500).json({ error: `While getting the documents info the following error occured: ${err}` });
          reject(err);
          // console.log('Error finding documents');
        } else {
          const documentInfo = [];
          // eslint-disable-next-line array-callback-return
          documents.map((document) => {
            // eslint-disable-next-line no-underscore-dangle
            const docData = `{ "year" : "${document.year}", "month" : "${document.month}", "institution" : "${document.institution}", "importance" : "${document.importance}", "description" : "${document.description}", "title" : "${document.title}", "id" : "${document._id.toString()}"}`;
            documentInfo.push(docData);
          });
          resolve(documentInfo);
        }
      });
    });
    // .replace(/'/g,'')
    let data = '{ "documentInfo": [';
    let comma = '';
    // console.log("Currently belong " + infoArray.length + " documents to " + res.locals.user.username);
    for (let i = 0; i < infoArray.length; i += 1) {
      if (i > 0) {
        comma = ',';
      }
      data = data + comma + infoArray[i];
    }
    data += ']}';

    const body = JSON.parse(data);
    // console.log(data);
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
    res.send(body);
  });
  // send pdf matching the id
  app.get('/documentPDF/:id', validateToken, (req, res) => {
    const { id } = req.params;
    Document.findById(id, 'filePath', (err, document) => {
      if (err) {
        // console.log('Error getting document by id');
        res.status(404).json({ error: "This id is not associated with any existing document" });
      } else if (!fs.existsSync(document.filePath)) {
        res.status(500).json({ error: "This document does not seem to exist anymore, probably because of a server restart" });
      } else {
        const stream = fs.createReadStream(document.filePath);
        res.writeHead(200, {
          'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(document.filePath))}'`,
          'Content-type': 'application/pdf',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET',
          'Access-Control-Expose-Headers': '*',
        });
        stream.pipe(res);
      }
    });
  });
  // start importing documents, send first pdf
  app.get('/importDocuments', validateToken, (req, res) => {
    const newFilesDir = `./newFiles`;
    // read current file directory (newFiles)
    fs.readdir(newFilesDir, (err, files) => {
      if (err) {
        console.log(err);
      } else {

        currentFileCount = files.length;
        if (files.length === 0) {
          res.statusCode = 204;
          res.set({
            'fileCount': 0,
            'Access-Control-Allow-Methods': 'POST, GET',
            'Access-Control-Expose-Headers': '*',

          });
          res.send();
        } else {
          console.log(files[0]);
          const fileToSend = `${newFilesDir}/${files[0]}`;
          // eslint-disable-next-line prefer-destructuring
          currentFile = files[0];
          console.log(`new Currentfile is: ${currentFile}`);
          const stream = fs.createReadStream(fileToSend);
          res.writeHead(200, {
            'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
            'Content-type': 'application/pdf',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET',
            fileCount: currentFileCount,
            'Access-Control-Expose-Headers': '*',
          });
          stream.pipe(res);
        }
      }
    });
  });
  // send receive specification of previous pdf and send next
  app.post('/currentDocumentData', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance', 'title']), async (req, res) => {
    const { year } = req.body;
    const { month } = req.body;
    const { institution } = req.body;
    const { importance } = req.body;
    const { description } = req.body;
    const { title } = req.body;
    const dirPath = `./files/${res.locals.user.username}/`;
    const filePrefix = `${year}-${month}-${institution}-${title}`;
    // console.log("Current user is: " + res.locals.user.username);

    // abort if no files are currently present, this block the case if currentDocumentData is called before importDocuments
    if (currentFileCount === 0 || currentFile == null) {
      // res.writeHead(204, {
      //   'Access-Control-Allow-Origin': '*',
      //   'Access-Control-Allow-Methods': 'POST, GET',
      //   fileCount: 0,
      //   'Access-Control-Expose-Headers': '*',
      // });
      //  res.send();
      res.statusCode = 204;
      res.set({
        'fileCount': 0,
        'Access-Control-Allow-Methods': 'POST, GET',
        'Access-Control-Expose-Headers': '*',
      });
      res.send();
      return;
    }
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        console.log(err);
      } else {
        // dynamically generate unique new filename
        const generatedFilename = dirPath + filePrefix;
        const newFilesDir = `./newFiles`;
        // move file from newFiles directory to fs/username
        fs.move(`${newFilesDir}/${currentFile}`, generatedFilename);
  
        currentFileCount -= 1;

        makedbEntry(year, month, institution, importance, description, title, generatedFilename.substr(2), res.locals.user._id);

        // send next file
        fs.readdir(newFilesDir, (error, otherFiles) => {
          if (error) {
            console.error(error);
          } else if (otherFiles.length === 0 || currentFileCount === 0) {
            currentFile = null;
            console.log(`New file count is: ${currentFileCount}`);
          
             res.statusCode = 200;
             res.set({
              'fileCount': 0,
              'Access-Control-Allow-Methods': 'POST, GET',
              'Access-Control-Expose-Headers': '*',
            });
             res.send();
          } else {
            console.log(`Current file count is ${currentFileCount}`);
            console.log(`Current number of files is ${otherFiles.length}`);
            let index = 0;
            // if (!isLocal) {
            //   index = 6 - currentFileCount;
            //   currentFile = otherFiles[index];
            // } else {
              // eslint-disable-next-line prefer-destructuring
              currentFile = otherFiles[1];
            // }
            console.log(`new Currentfile is: ${currentFile}`);
            const fileToSend = `${newFilesDir}/${otherFiles[index]}`;
            const stream = fs.createReadStream(fileToSend);
            res.writeHead(200, {
              'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(fileToSend))}'`,
              'Content-type': 'application/pdf',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, GET',
              fileCount: currentFileCount,
              'Access-Control-Expose-Headers': '*',
            });
            stream.pipe(res);
          }
        });
      }
    });
  });
  // merge pdf files given by id array and receive specifications of new document
  // currently now working since docker container do not have a java version installed (required for merging lib)
  app.post('/mergePDFs', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['year', 'month', 'institution', 'importance', 'title']), async (req, res) => {

    // eslint-disable-next-line no-prototype-builtins
    if (req.body.hasOwnProperty('pdfArray') && Array.isArray(req.body.pdfArray) && req.body.pdfArray.length >= 2) {
      const { year } = req.body;
      const { month } = req.body;
      const { institution } = req.body;
      const { importance } = req.body;
      const { description } = req.body;
      const { title } = req.body;
      const dirPath = `./files/${res.locals.user.username}/`;
      const filePrefix = `${year}-${month}-${institution}-${title}`;
      // console.log("Current user is: " + res.locals.user.username);
      // getting pdf array
      const pdfIDArray = req.body.pdfArray;
      const pdfArray = [];
      let idsAreValid = true;
      // check input array and create filePath array
      for (let i = 0; i < pdfIDArray.length; i += 1) {
        if (!mongoose.Types.ObjectId.isValid(pdfIDArray[i])) {
          idsAreValid = false;
          break;
        } else {
          // eslint-disable-next-line no-await-in-loop
          const file = await Document.findOne({ _id: pdfIDArray[i] }).exec();
          if (file == null) {
            idsAreValid = false;
            break;
          }
          pdfArray.push(file.filePath);
        }
      }
      if (idsAreValid) {
        // merging the pdfs
        merge(pdfArray, `./newFiles/newMergedPDF.pdf`, (err) => {
          if (err) {
            console.log(err);
            res.status(500).json({ error: "Error merging pdfs" });
            // eslint-disable-next-line no-useless-return
            return;
          } else {
            // console.log("successfully merge pdfs");
            deleteDocumentsFromDB(pdfIDArray);
            deleteDocumentsFromFS(pdfArray);
            const generatedFilename = generateFilename(dirPath, filePrefix);
            // write new file in db
            makedbEntry(year, month, institution, importance, description, title, generatedFilename.substr(2), res.locals.user._id);
            // move new file to fs
            fs.copyFile(`./newFiles/newMergedPDF.pdf`, generatedFilename, (error) => {
              if (error) {
                console.log(err);
              } else {
                console.log('Success');
              }
              fs.remove(`./newFiles/newMergedPDF.pdf`, (er) => {
                if (er) {
                  console.error(er);
                  return;
                }
              });
            });
          }
        });
        res.sendStatus(200);
        return;
      } else {
        res.status(400).json({ error: "Please use valid document ids" });
      }
    } else {
      res.status(400).json({ error: "Please send an object with keys pdfArray and value = array with at least 2 pdf ids" });
    }
  });
  // delete pdf matching pdf, works but frontend functionality will be implemented later
  app.post('/deleteDocument', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['documentID']), (req, res) => {
    Document.findOne({ _id: req.body.documentID }, (err, doc) => {
      if (err) {
        console.log(err);
      } else {
        // eslint-disable-next-line no-lonely-if
        if (fs.existsSync(doc.filePath)) {
          fs.unlink(doc.filePath);
          // console.log("File at " + doc.filePath + " has been deleted");
        } else {
          console.log("File to be deleted does not exist");
        }
      }
    });
    Document.deleteOne({ _id: req.body.documentID }, (err) => {
      if (err) {
        console.log(err);
      }
    });
    // console.log("Document " + req.body.documentID + " has been deleted from db");
    res.sendStatus(200);
  });
};
