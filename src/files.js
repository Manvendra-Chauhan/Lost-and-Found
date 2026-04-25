const fs = require('node:fs');

fs.writeFile('Blog.txt','hello rand',()=>{
    console.log('file has been edited ');

})
fs.mkdir('./assets', (err)=> {
    if(err){
        console.log(err);

    }
    console.log('folder created');
})