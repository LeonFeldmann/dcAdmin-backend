# dcAdmin-backend

This is the backend of the dcAdmin project, by 3406999 & 5483613.
The overall purpose is to provide a service that lets you digitalize and access your documents.
The backend is modeling a file system where a printer scans pdf files and drops them in the "newFiles" folder.
Here this is already done, for testing (and showcase) reasons, normally either a script or the user would move files into the newFiles folder. 
In this case 6 of our Analysis II scripts serve as test documents for our service and can be imported through the frontend. They will then be renamed and stored in the files folder, which will generate a dedicated subfolder for each user, to store his files in. 
There they can be accessed since when moving the files, the new filepath will be saved in a database entry. After importing all six files there will be no files left in the "newFiles" folder and no futher imports will be possible. If more imports are desired, please place further PDF-files in the "newFiles" folder before starting/building the service/image via docker.
Please note that some routes already exist, but are not yet used/addressed by the frontend(for example mergePDF)
Please also note that because of the simplicity and small number of methods in the backend, and the existing documentation through the YAML file, the use of jsdoc was deemed pointless.
Linting of the backend has been done using the ESLing extension of VS-Code and will as such not be executed in the build process.

Starting the app:
requirements: 
- have docker installed
- have node installed

The backend is intended to be started by npm scripts 
which in turn use gulp to build and start/stop the app (via docker)
This way there is no need to have gulp installed globally.

Quick start guide:
npm i
npm run gulp:run

Commands:
'npm i'                 ; run in the directory to install dependencies
'npm run gulp-run'      ; to build the image, start the application via docker-compose and run tests
                        ; the backend will be available on localhost:3000
'npm run gulp-destroy'  ; to stop the app and remove the docker-compose container with db information and the image 
'npm run gulp-stop'     ; to stop the app (and keep the db information)
'npm run gulp-start'    ; to start the app again and use existing db information

The following command allows you to pull the docker image for the backend from my dockerhub account 
and run the application using this image(without having to build locally).
'npm run gulp-runImage'