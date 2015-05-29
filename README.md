# uRank-Test
This is project tests uRank bower package (https://github.com/cecidisi/uRank). It depends on bower and grunt to handle all dependencies

## How to use it
First, install npm (https://nodejs.org/), cd to the project root and run ```npm install``` in the console to install necessary development dependencies (see file `package.json`).

The file `bower.json` specifies the project dependencies (jquery and urank), which is used by 'Gruntfile.js' to automate loading and injection tasks.

Gruntfile.js sets a config object with 3 paths: 
  * 'app': path/to/your/app/root, 
  * 'libs': folder where you wanna copy urank (see options 2 and 3), and 
  * 'htmlFile': path to file where you wan t to inject urank files and dependencies (here `app/index.html`)

Before runing any of the following grunt tasks, execute the command `bower cache clean`

There are 3 ways of downloading urank and including necessary files in you HTML:
  1. To downlaod urank to `bower_components` and include urank and dependencies directly from this folder, run: 
    ```grunt urank-load-all``` (recommended)
  2. To downlaod urank to `bower_components`, copy BOTH urank files AND dependencies into a folder in your project (`app/libs`), include ALL files in your HTML and delete `bower_components` folder, run: 
    ```grunt urank-copy-and-load-all```.
    Note: to avoid deleting `bower_components`, set the flag `bowercopy.options.clean = false` in `Gruntfile.js`
  3. To downlaod urank to `bower_components`, copy ONLY uRank files into a folder in your project (`app/libs`), include these files in your HTML and delete `bower_components` run: 
    ```grunt urank-copy-and-load```





