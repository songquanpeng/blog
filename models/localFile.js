const fs = require('fs');

const imageDir = "D:\\Project\\Web\\www\\public\\images\\show";
const videoDir = "D:\\Project\\Web\\www\\public\\videos\\show";


class LocalFile {
    static loadAllImages(callback) {
        fs.readdir(imageDir, (err, files) => {
            if (err) {
                console.log(err.message);
            }
            else {
                const result = [];
                files.forEach(file => {
                    result.push({"path": file, "description": file});
                });
                callback(result);
            }
        });
    }

    static loadAllVideos(callback){
        fs.readdir(videoDir, (err, files) => {
            if (err) {
                console.log(err.message);
            }
            else {
                const result = [];
                files.forEach(file => {
                    result.push({"path": file, "description": file});
                });
                callback(result);
            }
        });
    }

}

module.exports.LocalFile = LocalFile;