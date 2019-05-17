const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

module.exports = {
    record: function record(req, res, next) {
        let time = new Date().toLocaleString();
        let name = "unknown";
        let ip = req.ip;
        if(ip.startsWith("::ffff:")){
            ip = ip.substr(7);
        }
        if (req.session.user !== undefined) {
            name = req.session.user.name;
        }
        //console.log(time+" "+userType+" "+userID+" "+ip);
        db.run('INSERT INTO system_log (time, name, ip) VALUES (?, ?, ?)', time, name, ip, (error)=>{
            if(error){
                console.error(error.message);
            }
        });
        next();
    }
};