var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const fs = require('fs');
let mysql = require('mysql');
let md5= require("md5");
let ejs= require("ejs");
var multer  = require('multer');
var upload = multer({ dest: 'images/' })


let myPass= fs.readFileSync("./pass.txt","utf-8");

let connection1 = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : myPass,
    database : 'finito_db'
  });



app.use( bodyParser.json() ); 
app.use(bodyParser.urlencoded({     
        extended: true
      })); 
      

app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
});
app.use(express.static(__dirname+"/public"));
app.use(express.static(__dirname+"/images"));

app.get("/",function(req,res)
{
    //let results= fs.readFileSync("./public/home.html",{encoding:"utf-8"})
    res.sendFile(__dirname+"/public/home.html");
})

app.post("/signup",function(req,res)
{
    let username= req.body.txt_user;
    let password= req.body.txt_password;
    let foundUser=false;
    connection1.query("Select username from users", function(error, results, fields) {
        if (error) throw error;
        results.forEach((val)=>{
            if(val.username===username)
            {

                res.end("user Exists");
                foundUser=true;
                return;
            }
        })
        if(!foundUser)
        {
        connection1.query(`Insert into users (username,password) values ('${username}','${md5(password)}')`,function(error, results, fields){
            if (error) throw error;
            res.redirect("/tasks?user_id"+username+"&date="+new Date().valueOf()); 
            
        })
    }
      });
})

app.get("/weekly",function(req,res){
    
    let dayinms = 0;
    let datequery = req.query.date;
    let dateval = (new Date(datequery).valueOf())-dayinms;
    let date = new Date(dateval).toJSON().slice(0,10);
    let weekarray = new Array();
    for(let j=0;j<7;j++){
        
    let weekarray2;
        let datej = new Date(dateval+(24*60*60*100*j)).toJSON().slice(0,10);
            let samplequery = "SELECT tasks.*, DATE_FORMAT(tasks.start, '%Y-%m-%d') FROM tasks WHERE start >=  '"+datej+"'  && start < ( '"+datej+"'  + INTERVAL 1 DAY) ";
            connection1.query(samplequery+`AND user_id = '${req.query.user_id}' ORDER BY DATE(start) ASC`,function(error, results, fields){
                if (error) throw error;
                weekarray2=results;
            });
            weekarray.push(weekarray2);
        
    
    }
    res.send(weekarray);
    return;
});
app.get("/taskslist",function(req,res){
    var datequery = req.query.date;
    var dateq = new Date(datequery);
    var date = dateq.getFullYear()+"-"+(dateq.getMonth()+1)+"-"+dateq.getDate();
    console.log(date);
    var samplequery = "SELECT tasks.*, DATE_FORMAT(tasks.start, '%Y-%m-%d') FROM tasks WHERE start >=  '"+date+"'  && start < ( '"+date+"'  + INTERVAL 1 DAY) ";
 
    connection1.query(samplequery+`AND user_id = '${req.query.user_id}' ORDER BY DATE(start) ASC`,function(error, results, fields){
        if (error) throw error;
        results = getDayMatrix(results);
        res.send(results);
        return;
    })
});

app.get("/tasktime",function(req,res){
    var datequery = req.query.date;
    var time = parseInt(req.query.time);
    var date = new Date(datequery).toJSON().slice(0,10);
    var samplequery = "SELECT tasks.*, DATE_FORMAT(tasks.start, '%Y-%m-%d %h:%i:%s') FROM tasks WHERE start >= '"+date+"' && start < ('"+date+"' + INTERVAL 1 DAY) ";
    connection1.query(samplequery+`AND user_id = '${req.query.user_id}' ORDER BY DATE(start) ASC`,function(error, results, fields){
        if (error) throw error;
        
        results = getDayMatrix(results);
        var i =0;
        results.forEach((val)=>{
            i++;
            if(i==time)
            {res.send(val);
            return;}
        });
        return;
    })
});
app.get("/nexttask",function(req,res){
    var currenttask = req.query.task_id; var date = new Date(parseInt(req.query.date)).toJSON().slice(0,10);
    var samplequery = "SELECT tasks.*, DATE_FORMAT(tasks.start, '%Y-%m-%d %h:%i:%s') FROM tasks WHERE start >=  '"+date+"'  && start < ( '"+date+"'  + INTERVAL 1 DAY) ";
    connection1.query(samplequery+`AND user_id = '${req.query.user_id}' ORDER BY DATE(start) ASC`,function(error, results, fields){
        if (error) throw error;
        
        results = getDayMatrix(results);
        var i =0;
        results.forEach((val)=>{
            if(i==0){  if(val.id!=currenttask)
                {i++;
                    res.send(val);
                    return;}}
          
        });
        // var freetime = {title:"Free Time",start:0,end:0};
        // res.send(freetime);
        // return;
    })
});

app.get("/tasks",function(req,res){
    var date = new Date(parseInt(req.query.date)).toJSON().slice(0,10);
    var samplequery = "SELECT tasks.*, DATE_FORMAT(tasks.start, '%Y-%m-%d') FROM tasks WHERE start >= '"+date+"' && start < ('"+date+"' + INTERVAL 1 DAY) ";
    connection1.query(samplequery+`AND user_id = '${req.query.user_id}' ORDER BY DATE(start) ASC`,function(error, results, fields){
        if (error) throw error;
        
        results = getDayMatrix(results);
        ejs.renderFile(__dirname+"/public/tasks.ejs", {ejsObj:JSON.stringify(results)}, function(e, dt) {
            res.send(dt);
          });
    })
});
app.get("/task",function(req,res){
    
    ejs.renderFile(__dirname+"/public/addtask.ejs",function(e, dt) {
        // Send the compiled HTML as the response
        res.send(dt);
      });
});

app.post("/task",function(req,res){
    let user_id = req.body.username;
    let tasktitle = req.body.tasktitle; 
    let tasknote = req.body.tasknote; 
    let taskstart = req.body.taskstart; 
    let taskend = req.body.taskend; 
    let resistance = req.body.resistance; 
    let priority = req.body.priority; 
    let isfixed = req.body.isfixed; 
    connection1.query(`Insert into tasks (user_id,title,notes,start,end,resistance,priority,isfixed) values ('${user_id}','${tasktitle}','${tasknote}','${taskstart}','${taskend}',${resistance},${priority},${isfixed})`,function(error, results, fields){
        if (error) throw error;
        res.redirect("/tasks?user_id="+user_id+"&date="+new Date().valueOf()+""); 
    })
});
app.get("/signin",function(req,res){
    let username= req.query.txt_user;
    let password= req.query.txt_password;
    if(username==="admin" && password === "admin")
    {
        connection1.query("Select * from userinfo", function(error, results, fields) {
            results.forEach((val)=>{
                val.text=fs.readFileSync(val.texturl,"utf-8",function(){});
                val.texturl=null;
            })
            res.redirect("/tasks?user_id="+username+"&date="+new Date().valueOf()+""); 
        })
        return;
    }
    else
    {
        let foundUser=false;
    connection1.query("Select username from users", function(error, results, fields) {
        if (error) throw error;
        results.forEach((val)=>{
            if(val.username===username)
            {
                foundUser=true;
                connection1.query(`Select * from tasks where user_id='${val.username}'`, function(error, results1, fields) {
                    res.redirect("/tasks?user_id="+username+"&date="+new Date().valueOf()+"");
                    
                    return;
                })
            }
            
        })
        if(!foundUser)
        {
            res.end("user does not exist");
        }
      });
    }
    
})


var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("listening on 8081");
 })
 function getDayMatrix(results){
       var gfg = new Array(24); 
  
  
// Loop to initilize 2D array elements. 
for (var i = 0; i < 24; i++) { 
    results.forEach((val)=>{
        var date = getTodayAtX(i);
        var date2 = getTodayAtX(i+1);
        var resdate = new Date(val.start);
        var resdate2 = new Date(val.end);
        // if(resdate>date && resdate<date2){
        //    gfg[i]=val;
        // }
        if(resdate2>date){
            if(resdate<date){
                gfg[i]=val;
            }
        }
    })
    
}
return gfg;  
 }
 function getTodayAtX(index){
     var currentdate = new Date(); 
     var datetime = new Date(currentdate.getFullYear(), currentdate.getMonth(), currentdate.getDate(), index, 0, 0, 0);
    
                return datetime;
 }
 function getNDayAtX(current,index){
     var datetime = new Date(currentdate.getFullYear(), currentdate.getMonth(), currentdate.getDate(), index, 0, 0, 0);
    
                return datetime;
 }
 