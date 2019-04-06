const fs = require('fs');

const imageDir = "D:\\Project\\Web\\www\\public\\images\\show";

class Image {

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
                // console.log(result);
                callback(result);
            }
        });
    }
}

module.exports.Image = Image;