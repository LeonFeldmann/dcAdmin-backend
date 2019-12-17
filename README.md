# WebFileViewerProject
This is the readme.



Starting the app:

requirements: 
- have docker installed
- have node installed


npm run XXX
for npm scripts

run 'npm i' in the directory
run 'docker:up' to build and start the application via docker-compose and run tests
    the backend will be available on localhost:3000
run 'gulp docker:stop' to stop the app and keep the db information
run 'gulp docker:start' to start the app again and use existing db information
run 'gulp docker:down' to stop the app and remove the docker-compose container with db     information 

