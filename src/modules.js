const fs = require('node:fs');

fs.readFile('Blog.txt' ,(err,data) =>{
    if(err){ console.log(err)};
    //console.log(data); we will get a buffer for this
    console.log(data.toString())//this will print what i want to print
})
