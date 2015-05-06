# uRank-Test
This is project tests uRank bower package (https://github.com/cecidisi/uRank). It depends on bower and grunt to handle all dependencies

## How to use it
First, install npm (https://nodejs.org/) and run ```npm install``` in the console to install necessary development dependencies (see file `package.json`).

The file `bower.json` specifies the project dependencies (jquery and urank), which is used by 'Gruntfile.js' to automate loading and injection tasks.

Gruntfile.js sets a config object with 3 paths: 
  * 'app': path/to/your/ptoject/root, 
  * 'libs': folder where you wanna copy urank (see options 2 and 3), and 
  * 'htmlFile': path to file where you wan t to inject urank files and dependencies (here `app/index.html`)

There are 3 ways of downloading urank and including necessary files in you HTML:
  1. To downlaod urank to `bower_components` and include urank and dependencies directly this folder, run: 
    ```grunt urank-wiredep``` (recommended)
  2. To downlaod urank to `bower_components`, copy BOTH urank files AND dependencies into a folder in your project (`app/libs`), include ALL files in your HTML and delete `bower_components`, run: 
    ```grunt urank-load-all```.
    Note: to avoid deleting `bower_components`, set the flag `bowercopy.options.clean = false` in `Gruntfile.js`
  3. To downlaod urank to `bower_components`, copy ONLY uRank files into a folder in your project (`app/libs`) and include these files in your HTML run: 
    ```grunt urank-load```





