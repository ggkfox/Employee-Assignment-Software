# Lifeguard Employee Tracking System

## Technologies Being Used (so far)

Front-End:

	HTML5
	CSS3
	JavaScript

Server Technology: 

	Node.js v8.5.0

Database: 

	MongoDB

Framework: 

	Express.js

Build Tools:

	Gulp.js
	Nodemon

Package Managers:

	NPM
	Bower

Integrated Development Environment: 

	Cloud9
	
Other Tools:

	Google Fonts (fonts)
	Font Awesome (icons)
	Unsplash (copyright-free images)
	EJS


How to run the application:

	STEP 1: Open up a Cloud9 account and create a Node.js workspace.
	
	STEP 2: Delete everything inside that workspace. Then do git clone https://github.com/ggkfox/CSCI-150.git
	
	STEP 3: Type node -v to check the version of Node.js. If it is 6.xx.x then you need to type nvm install 8 
		    which will install Node v. 8.5.0. Once you typed that command, type node -v again to make sure you
		    are running Node 8.
		    
	STEP 4: Type npm install -g nodemon
			Nodemon is a tool we are using so that we don't need to constantly recompile our application every 
			time we make a change.
	
	STEP 5: cd into the CSCI-150 folder and then cd into the latest version (or whatever version you want). Then
			type npm install. This will install a node_modules folder.
			
	STEP 6: Then type nodemon server.js and this will start the server. Click on the "Preview" button next to the run
			button and choose "Preview Running Application." A window will pop up. Copy the url and close that window
			and enter a link in another browser tab.