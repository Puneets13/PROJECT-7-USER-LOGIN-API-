// THIS FILE CONTAINS ALL THE CALLBACK FUNCTIONS OF VARIOUS ROUTES
require('dotenv').config();
const nodemailer=require('nodemailer');
const jwt = require('jsonwebtoken'); //for signup and login facility to verify the user
const User = require('../models/User.js');
const User2 = require('../models/User2.js');

const Hostel= require('../models/Hostel.js');
//for otp verification
const UserOTPVerification=require('../models/UserOTPVerification');
const UserForgetPassVerification = require('../models/UserForgetpasswordVerifications');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');   //for encrypting the password to be sent over the server

// define the cloudinary variable 
const cloudinary = require('cloudinary').v2;

// CONFIGURE THE USER BY TAKING API KEY AND API_SECRET FROM cloudinary offical website
cloudinary.config({
    cloud_name: process.env.cloudinary_cloud_name,    //get these values from the cloudinary after login
    api_key: process.env.cloudinary_api_key,
    api_secret: process.env.cloudinary_api_secret
});


// nodemailer for otp geeration
let transporter=nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.nit_login_email,
        pass: process.env.nit_login_pass
    }
})

transporter.verify((error, success)=>{
    if (error) {
   console.log(error);
    } else {
      console.log('Email sent: ');
      console.log(success);
      // do something useful
    }
  });

  
module.exports.sendRegisterationEmail = async function(req,res){
    const roomNumber = req.body.roomNumber ; 
    const hostelName = req.body.hostelName;
    const email = req.body.email;
    const userName = req.body.userName ;
    const mailOptions ={
        from:'nitjhostelsapp@gmail.com',
        to:email,
        subject:"Room Registered",
        html:`
        \nDear ${userName},
        <p>\nWe are pleased to inform you that your room registration has been successful.</p>
        You have been assigned the room number ${roomNumber} at ${hostelName}.
        <p>\nWe hope that your stay at our hostel will be comfortable and enjoyable, and we look forward to welcoming you soon.</p>
        <p>\nThank you for choosing ${hostelName}, and we wish you a pleasant experince ahead.</p>
        \n<p>If you have any further questions or concerns, please do not hesitate to contact us at Hostel Contact Information.</p>
         \n\nBest regards.
         <p>NITJ Hostels </p>`
    };

    try{
        await transporter.sendMail(mailOptions);
        res.status(200).json({
            message: "successfull"
        });

    }catch(error){
           
        res.status(200).json({
            message: "failed",
            error:error
        });

    }

}

module.exports.getAllUsers = function (req, res) {
    // fetching all the users from the mongoDB database
    User.find()
        .then(result => {
            console.log(result);
            res.status(200).json({
                users: result,
                error: "successfull"
            });
        })
        .catch(err => {
            console.log(err);
            res.json({
                error: err,
                message: "false"
            });
        });
};

// to add the file over the server at cloudinary ...add the code there in post function 
// FUNCTION TO UPLOAD THE IMAGE IN CLOUDINARY
module.exports.setUserProfile = function (req, res) {
    console.log(req.body)
    const file = req.files.photo;
    cloudinary.uploader.upload(file.tempFilePath, (err, result) => {
        console.log(result);
        console.log("image uploaded to cloudinary")
        var id = req.params.id;

        // find the user by its id and update the Photo as requested by the user
        User.findOneAndUpdate({ _id: req.params.id }, {
            // update on the MongoDB server also with the link of the image
            $set: {
                avatar: result.url //USERNAME WILL BE UPDATED BUT NOW SHOWN IN THE RESPONSE SO WE NEET TO FETCH IT FROM DATABASE ITSELF 
                // OR FROM USER INPUT
            }


        })
            .then(result1 => {


                console.log("user Profile Updated");
                // deleting the previous image from the cloudinary also ...since the result1 also contains the previous avatar not the updated one
                // so we can get the image url from there and check if it is the default image or other
                // if deafult then we fill not run this comand else we will remove from cloudinary  
    const imageURL =result1.avatar;
    if (imageURL.includes("res.cloudinary.com")) {
        // trim the image to the specific part requeired to remove it from cloudinary itslef
        // this will increase the efficiemcy of the cloudinary storage by removing it at the time when the user changes its photo
                    const urlarr = imageURL.split("/")
                    const image = urlarr[urlarr.length - 1];
                    const Imagename = image.split(".")[0];
                    cloudinary.uploader.destroy(Imagename, (err, result) => {
                        console.log("image removed from cloduinary");
                    })
                }


                user = {

                    _id: result1._id,
                    username: result1.username,
                    email: result1.email,
                    avatar: result.url,
                    rollNumber:result1.rollNumber,
                    phone:result1.phone,
                    address:result1.address,
                    branch:result1.branch,
                    gender:result1.gender

                }
                res.status(200).json({
                    messsage: 'Image Updated Successfully',
                    user: user
                    //the result will not be the updated value but the previous value so we created the new user json 

                });
            })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    Error: err
                });
            });

    })

}



// to forget password
module.exports.forgetPassword = async function(req,res){
    let email = req.body.email;
let user_exist = await User.findOne({email:req.body.email,verified:true});
if(!user_exist){
    console.log("user exist nhi krda");
     res.json({
            message:"user not registered",
            error:"failed"
        })
}else{
    console.log("user exist krda");
    // res.json({
    //     message:"user exist",
    //     error:"failed"
    // })
    sendForgetOTPVerificationEmail(email,res);
}

}





// THE CREATE FUNCTION BEFORE ADDING THE PICTURE TO CLOUDINARY 

module.exports.createUser = function (req, res) {
    bcrypt.hash(req.body.password, 10, async (err, hash) => {
        if (err) {
            return res.status(500).json({
                error: err,
                message: "false"
            })
        }
        else {
            const { username, email,gender} = req.body
            // FUNCTION TO MAKE THE EMAIL ENTER ONLY ONCE IN THE DATABASE 
            let user_exist_true = await User.findOne({ email: email ,verified:true});
            if (user_exist_true) {
                // if we will specify the status then whiile using the API in android ...we can not get the messages as a response 
                // bcx the status code is set as 500
                res.json({
                    error: "EMAIL already exists",
                    message: "false",

                })
            }
            
            else {
                let user_exist_false = await User.findOne({ email: email ,verified:false});
                if(user_exist_false){
                    await User.deleteMany({email});
                    await UserOTPVerification.deleteMany({email});
                    
                    console.log("deleted pehla wala false");
                }

                let size = 200;
                let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
                const user = new User({
                    _id: new mongoose.Types.ObjectId,
                    password: hash,
                    username: req.body.username,
                    email: req.body.email,
                    avatar: avatar,
                    gender:req.body.gender,
                    rollNumber:req.body.rollNumber,
                    verified:false

                });
               
                user.save()
                    .then(result => {
                        console.log(result);
                        //   var user={    //since we are not using the user object created above bcz we have alredy created the above user 
                        //         "_id":req.body.ID,
                        //         "username":req.body.username,
                        //         "email":req.body.email,
                        //         "avatar":avatar
                        //     }
                        // res.status(200).json({
                        //     message: "success",
                        //     error: "No Error",
                        //     user: user,
                        //     // username: req.body.username,
                        //     // email: req.body.email
                        // });
                        sendOTPVerificationEmail(result,res);
                    })

                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: "error in saving",
                            err: err,
                            message: "false"
                        });
                    });
            }


        }
    })
};


// Forget password email verification 
//otp verification function
const sendForgetOTPVerificationEmail= async(email,res)=>{

    // 1000+(0 to 8999)
    try{
        const otpreal=`${1000+Math.random()*9000}`;
        const otp=`${Math.floor(otpreal)}`;
        console.log(otp);
        //mail
        const mailOptions ={
            from:'nitjhostelsapp@gmail.com',
            to:email,
            subject:"Reset Your Password",
            html:`
            <h3>User Confirmation Mail\n\n</h3>
            \nDear Student,
            <a href= >Enter this OTP ${otp} for user verification.</a>
          
            <p>Submit this OTP for Reseting your password.</p>
            \n<p>If you have any further questions or concerns, please do not hesitate to contact us at Hostel Contact Information.</p>
            Best Regards
            <p>NITJ Hostels </p>`

        };
        console.log(mailOptions)
                const saltRounds=10;
        const hashOTP = await  bcrypt.hash(otp,saltRounds);
        console.log(hashOTP);


let entry_exist = await UserForgetPassVerification.findOne({email:email});
if(entry_exist){
    // if entry exists alredy then delete it first then create the new one
        await UserForgetPassVerification.deleteMany({email});
}

        const newOTPVerification= await new UserForgetPassVerification({
            _id:  new mongoose.Types.ObjectId,
            email:email,
            otp: hashOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
        });

        await newOTPVerification.save()
        .then(reult=>{
            console.log("hogya save")
        })
        .catch(error=>{
            console.log("nhi hua save")
            console.log(error);

        })

        await transporter.sendMail(mailOptions);
        res.json({
            staus:"PENDING",
            message:"Verification otp email sent",
            data:{
                email:email,
            },

        })
        
    }
    catch(error){
res.json({
    status:"failed",
    message:"error-msg"
})
    }
}


//otp verficisation 
module.exports.otpForgetverify=async function(req,res){
    try{
let {email,otp}=req.body;
if(!email||!otp){
    throw Error("Empty otp details are not allowed");

}
else{
    const UserotpVerificationRecords=await UserForgetPassVerification.find({
        email,
    });
    if(UserotpVerificationRecords.length<=0){
        throw new Error(
            "Account record doesnt exist or has been verified already"
        );
    }
    else{
        const {expiresAt}=UserotpVerificationRecords[0];
        const hashedOTP=UserotpVerificationRecords[0].otp;
        if(expiresAt<Date.now()){
            await UserForgetPassVerification.deleteMany({email});
            throw new Error("Code expired");
        }
        else{
            const validotp=await bcrypt.compare(otp,hashedOTP);
            if(!validotp){
                throw new Error("Invalid code passes. Check inbox");
            }
            else{
                console.log("user verified")
                res.json({
                    status:true,
                    message:`user email verified successfully`,
                })
            }
        }
    }
}
    }
    catch(error){
        res.json({
            status:"failed",
            message:error.message,
        })
    }
}




module.exports.resetPassword = async function(req,res){
    const email = req.body.email;
    const newpass= req.body.password;
    
    let user_exist = await User.findOne({email:email,verified:true});
if(!user_exist){
    console.log("user exist nhi krda");
     res.json({
            message:"user not registered",
            error:"failed"
        })
}else{
    // reset password
    console.log("user exist krda");
             // update the password
                    // encrypt the new password
                    // now update the password by encrypting new passsword
                    bcrypt.hash(newpass, 10, async (err, hash) => {
                        if (err) {
                            return res.status(500).json({
                                error: err,
                                message: "false"
                            })
                        } else {

                            User.findOneAndUpdate({email:email},{$set:{
                                password:hash
                            }})
                            .then(result=>{
                                console.log("Password updated")
                                res.json({
                                status:true,
                                message:`Password updated successfully`,
                            })
                            })
                            .catch(error=>{
                                res.json({
                                    error:error.message
                                })
                            })

                        }
                    })
}
    
}
    



//otp verification function
const sendOTPVerificationEmail= async({email},res)=>{

    // 1000+(0 to 8999)
    try{
        const otpreal=`${1000+Math.random()*9000}`;
        const otp=`${Math.floor(otpreal)}`;
        console.log(otp);
        //mail
        const mailOptions ={
            from:'nitjhostelsapp@gmail.com',
            to:email,
            subject:"Verify your email",
            html:`
            <h3>Email Confirmation\n\n</h3>
            \nDear Student,
            <a href= > Enter this OTP ${otp} to verify your email address.</a>
            \n<p>If you have any further questions or concerns, please do not hesitate to contact us at Hostel Contact Information.</p>
            <p>Thank you for Registering with us.</p>
            Best Regards
            <p>NITJ Hostels </p>`

        };
        console.log(mailOptions)
                const saltRounds=10;
        const hashOTP = await  bcrypt.hash(otp,saltRounds);
        console.log(hashOTP);

        const newOTPVerification= await new UserOTPVerification({
            _id:  new mongoose.Types.ObjectId,
            email:email,
            otp: hashOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
        });

        await newOTPVerification.save()
        .then(reult=>{
            console.log("hogya save")
        })
        .catch(error=>{
            console.log("nhi hua save")
            console.log(error);

            
        })

        await transporter.sendMail(mailOptions);
        res.json({
            staus:"PENDING",
            message:"Verification otp email sent",
            data:{
                email:email,
            },

        })
        
    }
    catch(error){
res.json({
    status:"failrd",
    message:"error-msg"
})
    }
}

//otp verficisation 
module.exports.otpverify=async function(req,res){
    try{
let {email,otp}=req.body;
if(!email||!otp){
    throw Error("Empty otp details are not allowed");

}
else{
    const UserotpVerificationRecords=await UserOTPVerification.find({
        email,
    });
    if(UserotpVerificationRecords.length<=0){
        throw new Error(
            "Account record doesnt exist or has been verified already"
        );
    }
    else{
        const {expiresAt}=UserotpVerificationRecords[UserotpVerificationRecords.length-1];
        const hashedOTP=UserotpVerificationRecords[UserotpVerificationRecords.length-1].otp;
        if(expiresAt<Date.now()){
            await UserOTPVerification.deleteMany({email});
            throw new Error("Code expired");
        }
        else{
            const validotp=await bcrypt.compare(otp,hashedOTP);
            if(!validotp){
                throw new Error("Invalid code passes. Check inbox");
            }
            else{
                // User.updateOne({_id:userId},{verified:true});
                // res.json({
                //     status:true,
                //     message:`user email verified successfully`,
                // })
                User.findOneAndUpdate({email:email},{$set:{
                    verified:"true"
                }})
                .then(result=>{
                    console.log("updated user verify")
                    res.json({
                    status:true,
                    message:`user email verified successfully`,
                })
                })
                .catch(error=>{
                    res.json({
                        error:error.message
                    })
                })
            }
        }
    }
}
    }
    catch(error){
        res.json({
            status:"failed",
            message:error.message,
        })
    }
}



//resnd otp

module.exports.resentOTP= async function(req,res){
try {
    let{email}=req.body;
if(!email){
    throw Error("Empty user details are not allowed");
}
else{
    try{
    await UserOTPVerification.deleteMany({email});
    }
    catch(err){
        console.log("not deleted");
    }
    sendOTPVerificationEmail({email},res);
}
} catch (error) {
    res.json({
        status:"failed",
        message:error.message
    })
   
}
}
// FUNCTION FOR LOGGING IN USER (REQUIRES JWT INSTALLASTION)
module.exports.loginUser = function (req, res) {

    User.find({ email: req.body.email }).exec()
        .then(user => {
            if (user.length < 1) {
                // soecify return if the error message is to be printed without specifing the status(500) else server will crash
                return res.json({
                    error: "user not found",
                    message: "false"
                })
            }
            if (user[0].verified == false) {
                // soecify return if the error message is to be printed without specifing the status(500) else server will crash
                return res.json({
                    error: "please register again",
                    message: "not verified"
                })
            }
            bcrypt.compare(req.body.password, user[0].password, async (err, result) => {
                if (!result) {
                    return res.json({
                        message: "false",
                        error: "Incorrect Password"
                    })
                }
                if (result) {
                    let size = 200;
                    let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
                    console.log("User logged in");
                    const token = jwt.sign(
                        {
                            email: user[0].email,
                            userId: user[0]._id
                        },
                        "@#$#$__NITJALANDHAR_MESSMANGEMENT__@#$#$", // Replace with your secret key
                        {
                            expiresIn: "12h" // Token expires in 12 hours
                        }
                    );

                    let hostel= await Hostel.findOne({$or:[{email1: req.body.email},{email2:req.body.email}]});
                    let hostel1={};
                    if(hostel==null){
                        hostel1={

                        }
                    }

// Since the Admin roles are not present in the Hostel Records so they will return null.
// handling them in this way.
                    const emailToHostelMapping = {
                        "bh7@nitj.ac.in": { hostelName: "Boys Hostel 7", roomNumber: "000" },
                        "bh7E@nitj.ac.in": { hostelName: "Boys Hostel 7E", roomNumber: "000" },
                        "bh3@nitj.ac.in": { hostelName: "Boys Hostel 3", roomNumber: "000" },
                        "bh4@nitj.ac.in": { hostelName: "Boys Hostel 4", roomNumber: "000" },
                        "bh6@nitj.ac.in": { hostelName: "Boys Hostel 6", roomNumber: "000" },
                        "mbh.B@nitj.ac.in": { hostelName: "Mega Boys Hostel B", roomNumber: "000" },
                        "mbh.A@nitj.ac.in": { hostelName: "Mega Boys Hostel A", roomNumber: "000" },
                        "mbh.F@nitj.ac.in": { hostelName: "Mega Boys Hostel F", roomNumber: "000" },
                        "mgh.A@nitj.ac.in": { hostelName: "Girls Hostel A", roomNumber: "000" },
                        "mgh.B@nitj.ac.in": { hostelName: "Girls Hostel B", roomNumber: "000" },
                        "mgh@nitj.ac.in": { hostelName: "Mega Girls Hostel", roomNumber: "000" }
                      };

                      // Check if the email exists in the mapping
                        const email = req.body.email;
                        const hostelDetails = emailToHostelMapping[email];

                        // If email exists in the mapping, assign the corresponding hostel details to hostel1
                        if (hostelDetails) {
                        hostel1 = {
                            hostelName: hostelDetails.hostelName,
                            roomNumber: hostelDetails.roomNumber
                        };
                        } 

                   
                    if(hostel!=null){
                        hostel1={
                            roomNumber:hostel.roomNumber,
                            hostelName:hostel.hostelName
                        }  
                    }
                    res.status(200).json({
                        message: "User logged in",
                        error: "successful",
                        user: user[0],
                        token:token,
                           //to get the 0th index user values out of the array received form find() function
                        hostel:hostel1 
                    })

                }
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })

}

module.exports.getUser = function (req, res) {
    User.findById(req.params.id)
        .then(result => {
            console.log(result);
            res.status(200).json({
                user: result
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                Error: err
            });
        });

};




//for lab work new function added
module.exports.createUser2 = function (req, res) {
    console.log(req.body) 

const person =  new User2({
    _id: new mongoose.Types.ObjectId,
    userName: req.body.userName,
    collegeName: req.body.collegeName,
    rollNumber:req.body.rollNumber

});

person.save()
.then(result=>{
    console.log(result);
    res.status(200).json({
        newUser: result,
        message:"true"
    }); 
})
.catch(err=>{
    console.log(err);
    res.status(500).json({
        error: err
    });
});   
}



//login for lab
module.exports.loginUser2 = function (req, res) {

    User.find({ email: req.body.email }).exec()
        .then(user => {
            if (user.length < 1) {
                res.status(500).json({
                    error: "user not found"
                })
            }
            bcrypt.compare(req.body.password, user[0].password, (err, result) => {
                if (!result) {
                    return res.status(500).json({
                        error: "Incorrect Password"
                    })
                }
                if (result) {
                    // if result match then create the token
                    console.log("User logged in");
                    
                    res.status(200).json({
                        message: "User logged in",
                        // _id:user[0]._id,
                        // username: user[0].username,
                        // email: user[0].email,
                        // phone: user[0].phone,
                        error:"none",
                        user: user[0]
                         })

                }
            })
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
    }







// TO DELETE THE IMAGE FROM THE CLOUDNIARY AS WELL AS FROM MONGODB USE THIS METHOD 
// QUERY is used for deleteing the image from cloudinary using & , ?

// http:// localhost:3000/users?id="123456" & imageURL=" "
// using split() method to get the imageURL from the URL query 

module.exports.deleteData = function (req, res) {
    const imageURL = req.query.imageURL;
    const urlarr = imageURL.split("/")
    const image = urlarr[urlarr.length - 1];
    const Imagename = image.split(".")[0];

    const userID = req.query.ID;
    User.remove({ _id: userID }).
        then(result => {

            cloudinary.uploader.destroy(Imagename, (err, result) => {
                console.log(err, result);
            })
            res.status(200).json({
                message: result
            })
        }).catch(error => {
            res.status(500).json({
                err: err
            })
        })
}

module.exports.deleteProfile = function (req, res) {
    const imageURL = req.query.imageURL;
    const urlarr = imageURL.split("/")
    console.log(imageURL);
    const image = urlarr[urlarr.length - 1];
    const Imagename = image.split(".")[0];

    const id = req.params.id;

    User.findOneAndUpdate({ _id: id }, {
        $set: {
            avatar: "https://gravatar.com/avatar/?s=" + 200 + '&d=retro'
        }
    })
        .then(result1 => {
            console.log("user Profile Updated");
            // remove from cloudinary too
            cloudinary.uploader.destroy(Imagename, (err, result) => {
                console.log(err, result);
            })
            user = {
                _id: req.params.id,
                username: result1.username,
                email: result1.email,
                avatar: "https://gravatar.com/avatar/?s=" + 200 + '&d=retro'  // updating the avatar with the default image so that something is visible 
            }
            res.status(200).json({
                messsage: 'user Profile Updated',
                user: user   //the result will not be the updated value but the previous value so we created the new user json 

            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                Error: err
            });
        });
}


module.exports.deleteUser = function (req, res) {
    User.remove({ _id: req.params.id })
        .then(result => {
            console.log("user Deleted");
            res.status(200).json({
                messsage: 'success',
                result: result
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                Error: err
            });
        });

};

// TO UPDATE THE PROFILE OF THE USER
module.exports.UpdateUser = function (req, res) {
    let email_whose_user_in_hostel_istobe_updated;
    User.findOneAndUpdate({ _id: req.params.id }, {
        $set: {
            username: req.body.username, //USERNAME WILL BE UPDATED BUT NOW SHOWN IN THE RESPONSE SO WE NEET TO FETCH IT FROM DATABASE ITSELF 
            phone : req.body.phone,
            address : req.body.address,
            branch:req.body.branch
            // OR FROM USER INPUT
        }
    })
        .then(async result => {
            console.log("user Updated");
            let user = {
                _id:result._id,
                username: req.body.username,  //since the updated username is not shown on the response body 
                email: result.email,     //accessing the properties from the result received (result will contain all the properties of user)
                avatar: result.avatar,
                phone : req.body.phone,
                address : req.body.address,
                branch:req.body.branch,
                rollNumber:result.rollNumber,
                gender:result.gender

            }

            email_whose_user_in_hostel_istobe_updated=result.email;

            let hh= await Hostel.findOne({$or:[{email1:email_whose_user_in_hostel_istobe_updated},{email2:email_whose_user_in_hostel_istobe_updated}]});
            let update_name=req.body.username;
            let update_phone=req.body.phone;
            let update_branch=req.body.branch;
            let update_address=req.body.address;
            
            if(hh.email1==email_whose_user_in_hostel_istobe_updated){
                await Hostel.findOneAndUpdate({$or:[{email1:email_whose_user_in_hostel_istobe_updated},{email2:email_whose_user_in_hostel_istobe_updated}]},{
                    $set:{
                        userName1:update_name,
                        phone1:update_phone,
                        branch1:update_branch,
                        address1:update_address
                    }
                })
            
            }
            else{
                await Hostel.findOneAndUpdate({$or:[{email1:email_whose_user_in_hostel_istobe_updated},{email2:email_whose_user_in_hostel_istobe_updated}]},{
                    $set:{
                        userName2:update_name,
                        phone2:update_phone,
                        branch2:update_branch,
                        address2:update_address
                    }
                })
            }
        
            res.status(200).json({
                messsage: 'user Updated Successfully',
                user: user   //the result will not be the updated value but the previous value so we created the new user json 

            });
        })
        .catch(err => {
            console.log(err);
            res.json({
                message:'error'
            });
        });



          

};






// FOR UPDATING THE USER PASSWORD  
// TO COMPARE PASSWORD <<DONOT HASH THE OLD PASSWORD >>
// 2. find the old password with the id entered by the user
// 3. to compare hashed password and the password stored in the dDatabase ..use ==>  bcrypt.compare()
// 4.Once user got authenticated then findOneAndUpdate() method is used and using id the user is again found
// 5. the password is $set:{} and updated 
module.exports.updatePassword = function (req, res) {

    // find the user and compare the password
    User.findById(req.params.id)
        .then(result => {
            console.log("userFound");
            bcrypt.compare(req.body.oldpassword, result.password, (err, result1) => {
                console.log(result1);
                if (!result1) {     //if result1 is true  then 
                    return res.json({
                        message: "false",
                        error: "Password donot match"
                    })
                }
                if (result1) {
                    // update the password
                    // encrypt the new password
                    // now update the password by encrypting new passsword
                    bcrypt.hash(req.body.newpassword, 10, async (err, hash) => {
                        if (err) {
                            return res.status(500).json({
                                error: err,
                                message: "false"
                            })
                        } else {
                            // set the password using findoneandUpdate
                            User.findOneAndUpdate({ _id: req.params.id }, {
                                $set: {
                                    password: hash  //new password
                                }
                            })
                                .then(result => {
                                    console.log("Password Updated");
                                    user = {
                                        username: result.username,  //since the updated username is not shown on the response body 
                                        email: result.email,     //accessing the properties from the result received (result will contain all the properties of user)
                                        avatar: result.avatar
                                    }
                                    res.status(200).json({
                                        error: 'Password Updated Successfully',
                                        message: "success",
                                        user: user   //the result will not be the updated value but the previous value so we created the new user json 

                                    });
                                })
                                .catch(err => {
                                    console.log(err);
                                    res.status(500).json({
                                        Error: err
                                    });
                                });

                        }
                    })
                }
            })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                Error: err
            });
        });

}







// // THIS FILE CONTAINS ALL THE CALLBACK FUNCTIONS OF VARIOUS ROUTES

// const jwt = require('jsonwebtoken'); //for signup and login facility to verify the user
// const User = require('../models/User.js');
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');   //for encrypting the password to be sent over the server

// // define the cloudinary variable
// // const cloudinary = require('cloudinary').v2;

// // CONFIGURE THE USER BY TAKING API KEY AND API_SECRET FROM cloudinary offical website
// // cloudinary.config({
// //     cloud_name: 'dytrs9xrm',    //get these values from the cloudinary after login
// //     api_key: '497511148242921',
// //     api_secret: 'Q_600GQHaMngyaWWBfllQRkk-iQ'
// // });

// module.exports.getAllUsers = function (req, res) {
//     // fetching all the users from the mongoDB database
//     User.find()
//         .then(result => {
//             console.log(result);
//             res.status(200).json({
//                 AllUsers: result
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });
// };


// // to add the file over the server at cloudinary ...add the code there in post function
// // FUNCTION TO UPLOAD THE IMAGE IN CLOUDINARY

// // module.exports.createUser = function (req, res) {
// //     console.log(req.body)
// //     const file = req.files.photo;
// //     cloudinary.uploader.upload(file.tempFilePath, (err, result) => {
// //         console.log(result);
// // }
// // )}


// // THE CREATE FUNCTION BEFORE ADDING THE PICTURE TO CLOUDINARY

// module.exports.createUser = function (req, res) {
//     bcrypt.hash(req.body.password, 10, async (err, hash) => {
//         if (err) {
//             return res.status(500).json({
//                 error: err
//             })
//         }
//         else {
//             const { username, email, password } = req.body
//             // FUNCTION TO MAKE THE EMAIL ENTER ONLY ONCE IN THE DATABASE
//             let user_exist = await User.findOne({ email: email });
//             if (user_exist) {
//                 res.json({
//                     success: false,
//                     message: "EMAIL already exists"
//                 })
//             }
//             else {
//                 let size = 200;
//                 let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
//                 const user = new User({
//                     _id: new mongoose.Types.ObjectId,
//                     password: hash,
//                     username: req.body.username,
//                     email: req.body.email,
//                     avatar: avatar

//                 });
//                 const token = jwt.sign({
//                     username: username,
//                     email: email,
//                     avatar: avatar
//                 },
//                     "This is secret key",   //this key is to be used in check_auth file for verification in verify function
//                     {
//                         expiresIn: '24h'
//                     });

//                 user.save()
//                     .then(result => {
//                         console.log(result);
//                         res.status(200).json({
//                             newUser: result,
//                             token: token
//                         });
//                     })
//                     .catch(err => {
//                         console.log(err);
//                         res.status(500).json({
//                             Error: err
//                         });
//                     });
//             }


//         }
//     })
// };

// // FUNCTION FOR LOGGING IN USER (REQUIRES JWT INSTALLASTION)
// module.exports.loginUser = function (req, res) {

//     User.find({ email: req.body.email }).exec()
//         .then(user => {
//             if (user.length < 1) {
//                 res.status(500).json({
//                     errr: "user not found"
//                 })
//             }
//             bcrypt.compare(req.body.password, user[0].password, (err, result) => {
//                 if (!result) {
//                     return res.status(500).json({
//                         errr: "Incorrect Password"
//                     })
//                 }
//                 if (result) {
//                     // if result match then create the token
//                     let size=200;
//                 let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
//                     console.log("User logged in");
//                     const token = jwt.sign({
//                         username: user[0].username,
//                         email: user[0].email,
//                         avatar:avatar

//                     },
//                         "This is secret key",   //this key is to be used in check_auth file for verification in verify function
//                         {
//                             expiresIn: '24h'
//                         });
//                     res.status(200).json({
//                         message: "User logged in",
//                         username: user[0].username,
//                         email: user[0].email,
//                         avatar: avatar[0].avatar,
//                         token: token
//                     })

//                 }
//             })
//         })
//         .catch(err => {
//             res.status(500).json({
//                 error: err
//             })
//         })

// }

// module.exports.getUser = function (req, res) {
//     User.findById(req.params.id)
//         .then(result => {
//             console.log(result);
//             res.status(200).json({
//                 user: result
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });

// };

// // TO DELETE THE IMAGE FROM THE CLOUDNIARY AS WELL AS FROM MONGODB USE THIS METHOD
// // QUERY is used for deleteing the image from cloudinary using & , ?

// // http:// localhost:3000/users?id="123456" & imageURL=" "
// // using split() method to get the imageURL from the URL query

// module.exports.deleteData = function (req, res) {
//     const imageURL = req.query.imageURL;
//     const urlarr = imageURL.split("/")
//     const image = urlarr[urlarr.length - 1];
//     const Imagename = image.split(".")[0];

//     const userID = req.query.ID;
//     User.remove({ _id: userID }).
//         then(result => {

//             cloudinary.uploader.destroy(Imagename, (err, result) => {
//                 console.log(err, result);
//             })
//             res.status(200).json({
//                 message: result
//             })
//         }).catch(error => {
//             res.status(500).json({
//                 err: err
//             })
//         })
// }



// module.exports.deleteUser = function (req, res) {
//     User.remove({ _id: req.params.id })
//         .then(result => {
//             console.log("user Deleted");
//             res.status(200).json({
//                 messsage: 'id deleted',
//                 result: result
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });

// };

// module.exports.UpdateUser = function (req, res) {
//     User.findOneAndUpdate({ _id: req.params.id }, {
//         $set: {
//             firstName: req.body.firstName,
//             lastName: req.body.lastName,

//         }
//     })
//         .then(result => {
//             console.log("user Updated");
//             res.status(200).json({
//                 messsage: 'user Updated',
//                 updated_user: result    //the result will not be the updated value but the previous value
//                 //but the id got updated
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });

// };

// //

// // THIS FILE CONTAINS ALL THE CALLBACK FUNCTIONS OF VARIOUS ROUTES
// const nodemailer=require('nodemailer');
// const jwt = require('jsonwebtoken'); //for signup and login facility to verify the user
// const User = require('../models/User.js');
// //for otp verification
// const UserOTPVerification=require('../models/UserOTPVerification')
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');   //for encrypting the password to be sent over the server
// // const Hostels = require('../models/Hostels.js');

// // define the cloudinary variable 
// const cloudinary = require('cloudinary').v2;

// // CONFIGURE THE USER BY TAKING API KEY AND API_SECRET FROM cloudinary offical website
// cloudinary.config({
//     cloud_name: 'dytrs9xrm',    //get these values from the cloudinary after login
//     api_key: '497511148242921',
//     api_secret: 'Q_600GQHaMngyaWWBfllQRkk-iQ'
// });

// // nodemailer for otp geeration
// let transporter=nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'nitjhostelsapp@gmail.com',
//         pass:'dlhcqeiiqiicqfqx'
//     }
// })

// transporter.verify((error, success)=>{
//     if (error) {
//    console.log(error);
//     } else {
//       console.log('Email sent: ');
//       console.log(success);
//       // do something useful
//     }
//   });

  
// module.exports.getAllUsers = function (req, res) {
//     // fetching all the users from the mongoDB database
//     User.find()
//         .then(result => {
//             console.log(result);
//             res.status(200).json({
//                 users: result,
//                 error: "successfull"
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.json({
//                 error: err,
//                 message: "false"
//             });
//         });
// };

// // to add the file over the server at cloudinary ...add the code there in post function 
// // FUNCTION TO UPLOAD THE IMAGE IN CLOUDINARY
// module.exports.setUserProfile = function (req, res) {
//     console.log(req.body)
//     const file = req.files.photo;
//     cloudinary.uploader.upload(file.tempFilePath, (err, result) => {
//         console.log(result);
//         console.log("image uploaded to cloudinary")
//         var id = req.params.id;

//         // find the user by its id and update the Photo as requested by the user
//         User.findOneAndUpdate({ _id: req.params.id }, {
//             // update on the MongoDB server also with the link of the image
//             $set: {
//                 avatar: result.url //USERNAME WILL BE UPDATED BUT NOW SHOWN IN THE RESPONSE SO WE NEET TO FETCH IT FROM DATABASE ITSELF 
//                 // OR FROM USER INPUT
//             }


//         })
//             .then(result1 => {
//                 console.log("user Profile Updated");
//                 // deleting the previous image from the cloudinary also ...since the result1 also contains the previous avatar not the updated one
//                 // so we can get the image url from there and check if it is the default image or other
//                 // if deafult then we fill not run this comand else we will remove from cloudinary  
//     const imageURL =result1.avatar;
//     if (imageURL.includes("res.cloudinary.com")) {
//         // trim the image to the specific part requeired to remove it from cloudinary itslef
//         // this will increase the efficiemcy of the cloudinary storage by removing it at the time when the user changes its photo
//                     const urlarr = imageURL.split("/")
//                     const image = urlarr[urlarr.length - 1];
//                     const Imagename = image.split(".")[0];
//                     cloudinary.uploader.destroy(Imagename, (err, result) => {
//                         console.log("image removed from cloduinary");
//                     })
//                 }


//                 user = {

//                     _id: result1._id,
//                     username: result1.username,
//                     email: result1.email,
//                     avatar: result.url,
//                     rollNumber:result1.rollNumber,
//                     phone:result1.phone,
//                     address:result1.address

//                 }
//                 res.status(200).json({
//                     messsage: 'Image Updated Successfully',
//                     user: user
//                     //the result will not be the updated value but the previous value so we created the new user json 

//                 });
//             })
//             .catch(err => {
//                 console.log(err);
//                 res.status(500).json({
//                     Error: err
//                 });
//             });

//     })

// }

// // THE CREATE FUNCTION BEFORE ADDING THE PICTURE TO CLOUDINARY 

// module.exports.createUser = function (req, res) {
//     bcrypt.hash(req.body.password, 10, async (err, hash) => {
//         if (err) {
//             return res.status(500).json({
//                 error: err,
//                 message: "false"
//             })
//         }
//         else {
//             const { username, email} = req.body
//             // FUNCTION TO MAKE THE EMAIL ENTER ONLY ONCE IN THE DATABASE 
//             let user_exist = await User.findOne({ email: email });
//             if (user_exist) {
//                 // if we will specify the status then whiile using the API in android ...we can not get the messages as a response 
//                 // bcx the status code is set as 500
//                 res.json({
//                     error: "EMAIL already exists",
//                     message: "false",

//                 })
//             }
//             else {
//                 let size = 200;
//                 let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
//                 const user = new User({
//                     _id: new mongoose.Types.ObjectId,
//                     password: hash,
//                     username: req.body.username,
//                     email: req.body.email,
//                     avatar: avatar,
//                     rollNumber:req.body.rollNumber,
//                     verified:false

//                 });
               
//                 user.save()
//                     .then(result => {
//                         console.log(result);
//                         //   var user={    //since we are not using the user object created above bcz we have alredy created the above user 
//                         //         "_id":req.body.ID,
//                         //         "username":req.body.username,
//                         //         "email":req.body.email,
//                         //         "avatar":avatar
//                         //     }
//                         // res.status(200).json({
//                         //     message: "success",
//                         //     error: "No Error",
//                         //     user: user,
//                         //     // username: req.body.username,
//                         //     // email: req.body.email
//                         // });
//                         sendOTPVerificationEmail(result,res);
//                     })

//                     .catch(err => {
//                         console.log(err);
//                         res.status(500).json({
//                             error: "error in saving",
//                             err: err,
//                             message: "false"
//                         });
//                     });
//             }


//         }
//     })
// };

// //otp verification function
// const sendOTPVerificationEmail= async({_id,email},res)=>{

//     // 1000+(0 to 8999)
//     try{
//         const otpreal=`${1000+Math.random()*9000}`;
//         const otp=`${Math.floor(otpreal)}`;
//         console.log(otp);
//         //mail
//         const mailOptions ={
//             from:'nitjhostelsapp@gmail.com',
//             to:email,
//             subject:"Verify your email",
//             html:`<p>Enter ${otp} un the app to verify email adress`
//         };
//         console.log(mailOptions)
//                 const saltRounds=10;
//         const hashOTP = await  bcrypt.hash(otp,saltRounds);
//         console.log(hashOTP);

//         const newOTPVerification= await new UserOTPVerification({
//             _id:  new mongoose.Types.ObjectId,
//             userId:_id,
//             otp: hashOTP,
//             createdAt: Date.now(),
//             expiresAt: Date.now() + 3600000,
//         });

//         await newOTPVerification.save()
//         .then(reult=>{
//             console.log("hogya save")
//         })
//         .catch(error=>{
//             console.log("nhi hua save")
//             console.log(error);

            
//         })

//         await transporter.sendMail(mailOptions);
//         res.json({
//             staus:"PENDING",
//             message:"Verification otp email sent",
//             data:{
//                 userId:_id,email,
//             },

//         })
        
//     }
//     catch(error){
// res.json({
//     status:"failrd",
//     message:"error-msg"
// })
//     }
// }

// //otp verficisation 
// module.exports.otpverify=async function(req,res){
//     try{
// let {userId,otp}=req.body;
// if(!userId||!otp){
//     throw Error("Empty otp details are not allowed");

// }
// else{
//     const UserotpVerificationRecords=await UserOTPVerification.find({
//         userId,
//     });
//     if(UserotpVerificationRecords.length<=0){
//         throw new Error(
//             "Account record doesnt exist or has been verified already"
//         );
//     }
//     else{
//         const {expiresAt}=UserotpVerificationRecords[0];
//         const hashedOTP=UserotpVerificationRecords[0].otp;
//         if(expiresAt<Date.now()){
//             await UserOTPVerification.deleteMany({userId});
//             throw new Error("Code expired");
//         }
//         else{
//             const validotp=await bcrypt.compare(otp,hashedOTP);
//             if(!validotp){
//                 throw new Error("Invalid code passes. Check inbox");
//             }
//             else{
//                 // User.updateOne({_id:userId},{verified:true});
//                 // res.json({
//                 //     status:true,
//                 //     message:`user email verified successfully`,
//                 // })
//                 User.findOneAndUpdate({_id:userId,
//                     $set:{
//                     verified:"true"
//                 }
//             })
//                 .then(result=>{
//                     console.log("updated user verify")
//                     res.json({
//                     status:true,
//                     message:`user email verified successfully`,
//                 })
//                 })
//                 .catch(error=>{
//                     res.json({
//                         message:"mai hoo",
//                         error:error.message
//                     })
//                 })
//             }
//         }
//     }
// }
//     }
//     catch(error){
//         res.json({
//             status:"failed",
//             message:error.message,
//         })
//     }
// }
// //resnd otp

// module.exports.resentOTP= async function(req,res){
// try {
//     let{userId,email}=req.body;
// if(!userId||!email){
//     throw Error("Empty user details are not allowed");
// }
// else{
//     try{
//     await UserOTPVerification.deleteMany({userId});
//     }
//     catch(err){
//         console.log("not deleted");
//     }
//     sendOTPVerificationEmail({_id:userId,email},res);
// }
// } catch (error) {
//     res.json({
//         status:"failed",
//         message:error.message
//     })
   
// }
// }
// // FUNCTION FOR LOGGING IN USER (REQUIRES JWT INSTALLASTION)
// module.exports.loginUser = function (req, res) {

//     User.find({ email: req.body.email }).exec()
//         .then(user => {
//             if (user.length < 1) {
//                 // soecify return if the error message is to be printed without specifing the status(500) else server will crash
//                 return res.json({
//                     error: "user not found",
//                     message: "false"
//                 })
//             }
//             bcrypt.compare(req.body.password, user[0].password, (err, result) => {
//                 if (!result) {
//                     return res.json({
//                         message: "false",
//                         error: "Incorrect Password"
//                     })
//                 }
//                 if (result) {
//                     // if result match then create the token
//                     let size = 200;
//                     let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
//                     console.log("User logged in");
//                     // const token = jwt.sign({
//                     //     username: user[0].username,
//                     //     email: user[0].email,
//                     //     avatar: avatar

//                     // },
//                     //     "This is secret key",   //this key is to be used in check_auth file for verification in verify function
//                     //     {
//                     //         expiresIn: '24h'
//                     //     });
//                     // var user = {
//                     //     _id:user[0].ID,
//                     //     username: user[0].username,
//                     //     email: user[0].email,
//                     //     avatar: avatar[0].avatar,
//                     // }
//                     res.status(200).json({
//                         message: "User logged in",
//                         error: "successful",
//                         user: user[0],   //to get the 0th index user values out of the array received form find() function
//                     })

//                 }
//             })
//         })
//         .catch(err => {
//             res.status(500).json({
//                 error: err
//             })
//         })

// }

// module.exports.getUser = function (req, res) {
//     User.findById(req.params.id)
//         .then(result => {
//             console.log(result);
//             res.status(200).json({
//                 user: result
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });

// };

// // TO DELETE THE IMAGE FROM THE CLOUDNIARY AS WELL AS FROM MONGODB USE THIS METHOD 
// // QUERY is used for deleteing the image from cloudinary using & , ?

// // http:// localhost:3000/users?id="123456" & imageURL=" "
// // using split() method to get the imageURL from the URL query 

// module.exports.deleteData = function (req, res) {
//     const imageURL = req.query.imageURL;
//     const urlarr = imageURL.split("/")
//     const image = urlarr[urlarr.length - 1];
//     const Imagename = image.split(".")[0];

//     const userID = req.query.ID;
//     User.remove({ _id: userID }).
//         then(result => {

//             cloudinary.uploader.destroy(Imagename, (err, result) => {
//                 console.log(err, result);
//             })
//             res.status(200).json({
//                 message: result
//             })
//         }).catch(error => {
//             res.status(500).json({
//                 err: err
//             })
//         })
// }

// module.exports.deleteProfile = function (req, res) {
//     const imageURL = req.query.imageURL;
//     const urlarr = imageURL.split("/")
//     console.log(imageURL);
//     const image = urlarr[urlarr.length - 1];
//     const Imagename = image.split(".")[0];

//     const id = req.params.id;

//     User.findOneAndUpdate({ _id: id }, {
//         $set: {
//             avatar: "https://gravatar.com/avatar/?s=" + 200 + '&d=retro'
//         }
//     })
//         .then(result1 => {
//             console.log("user Profile Updated");
//             // remove from cloudinary too
//             cloudinary.uploader.destroy(Imagename, (err, result) => {
//                 console.log(err, result);
//             })
//             user = {
//                 _id: req.params.id,
//                 username: result1.username,
//                 email: result1.email,
//                 avatar: "https://gravatar.com/avatar/?s=" + 200 + '&d=retro'  // updating the avatar with the default image so that something is visible 
//             }
//             res.status(200).json({
//                 messsage: 'user Profile Updated',
//                 user: user   //the result will not be the updated value but the previous value so we created the new user json 

//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });
// }


// module.exports.deleteUser = function (req, res) {
//     User.remove({ _id: req.params.id })
//         .then(result => {
//             console.log("user Deleted");
//             res.status(200).json({
//                 messsage: 'success',
//                 result: result
//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });

// };

// // USE PUT REQUEST TO UPDATE THE DATA AND TH EUPDATED DATA IS NOT REFLECTED ON THE RESPONSE

// // we can either go by ID or by email ...since both are unique in ur case 
// module.exports.UpdateUser = function (req, res) {
//     User.findOneAndUpdate({ _id: req.params.id }, {
//         $set: {
//             username: req.body.username, //USERNAME WILL BE UPDATED BUT NOW SHOWN IN THE RESPONSE SO WE NEET TO FETCH IT FROM DATABASE ITSELF 
//             phone : req.body.phone,
//             address : req.body.address,
//             branch:req.body.branch
//             // OR FROM USER INPUT
//         }
//     })
//         .then(result => {
//             console.log("user Updated");
//             user = {
//                 _id:result._id,
//                 username: req.body.username,  //since the updated username is not shown on the response body 
//                 email: result.email,     //accessing the properties from the result received (result will contain all the properties of user)
//                 avatar: result.avatar,
//                 phone : req.body.phone,
//                 address : req.body.address,
//                 branch:req.body.branch,
//                 rollNumber:result.rollNumber

//             }
//             res.status(200).json({
//                 messsage: 'user Updated Successfully',
//                 user: user   //the result will not be the updated value but the previous value so we created the new user json 

//             });
//         })
//         .catch(err => {
//             console.log(err);
//             res.json({
//                 message:'error'
//             });
//         });

// };



// // FOR UPDATING THE USER PASSWORD  
// // TO COMPARE PASSWORD <<DONOT HASH THE OLD PASSWORD >>
// // 2. find the old password with the id entered by the user
// // 3. to compare hashed password and the password stored in the dDatabase ..use ==>  bcrypt.compare()
// // 4.Once user got authenticated then findOneAndUpdate() method is used and using id the user is again found
// // 5. the password is $set:{} and updated 
// module.exports.updatePassword = function (req, res) {

//     // find the user and compare the password
//     User.findById(req.params.id)
//         .then(result => {
//             console.log("userFound");
//             bcrypt.compare(req.body.oldpassword, result.password, (err, result1) => {
//                 console.log(result1);
//                 if (!result1) {     //if result1 is true  then 
//                     return res.json({
//                         message: "false",
//                         error: "Password donot match"
//                     })
//                 }
//                 if (result1) {
//                     // update the password
//                     // encrypt the new password
//                     // now update the password by encrypting new passsword
//                     bcrypt.hash(req.body.newpassword, 10, async (err, hash) => {
//                         if (err) {
//                             return res.status(500).json({
//                                 error: err,
//                                 message: "false"
//                             })
//                         } else {
//                             // set the password using findoneandUpdate
//                             User.findOneAndUpdate({ _id: req.params.id }, {
//                                 $set: {
//                                     password: hash  //new password
//                                 }
//                             })
//                                 .then(result => {
//                                     console.log("Password Updated");
//                                     user = {
//                                         username: result.username,  //since the updated username is not shown on the response body 
//                                         email: result.email,     //accessing the properties from the result received (result will contain all the properties of user)
//                                         avatar: result.avatar
//                                     }
//                                     res.status(200).json({
//                                         error: 'Password Updated Successfully',
//                                         message: "success",
//                                         user: user   //the result will not be the updated value but the previous value so we created the new user json 

//                                     });
//                                 })
//                                 .catch(err => {
//                                     console.log(err);
//                                     res.status(500).json({
//                                         Error: err
//                                     });
//                                 });

//                         }
//                     })
//                 }
//             })
//         })
//         .catch(err => {
//             console.log(err);
//             res.status(500).json({
//                 Error: err
//             });
//         });

// }







// // // THIS FILE CONTAINS ALL THE CALLBACK FUNCTIONS OF VARIOUS ROUTES

// // const jwt = require('jsonwebtoken'); //for signup and login facility to verify the user
// // const User = require('../models/User.js');
// // const mongoose = require('mongoose');
// // const bcrypt = require('bcrypt');   //for encrypting the password to be sent over the server

// // // define the cloudinary variable
// // // const cloudinary = require('cloudinary').v2;

// // // CONFIGURE THE USER BY TAKING API KEY AND API_SECRET FROM cloudinary offical website
// // // cloudinary.config({
// // //     cloud_name: 'dytrs9xrm',    //get these values from the cloudinary after login
// // //     api_key: '497511148242921',
// // //     api_secret: 'Q_600GQHaMngyaWWBfllQRkk-iQ'
// // // });

// // module.exports.getAllUsers = function (req, res) {
// //     // fetching all the users from the mongoDB database
// //     User.find()
// //         .then(result => {
// //             console.log(result);
// //             res.status(200).json({
// //                 AllUsers: result
// //             });
// //         })
// //         .catch(err => {
// //             console.log(err);
// //             res.status(500).json({
// //                 Error: err
// //             });
// //         });
// // };


// // // to add the file over the server at cloudinary ...add the code there in post function
// // // FUNCTION TO UPLOAD THE IMAGE IN CLOUDINARY

// // // module.exports.createUser = function (req, res) {
// // //     console.log(req.body)
// // //     const file = req.files.photo;
// // //     cloudinary.uploader.upload(file.tempFilePath, (err, result) => {
// // //         console.log(result);
// // // }
// // // )}


// // // THE CREATE FUNCTION BEFORE ADDING THE PICTURE TO CLOUDINARY

// // module.exports.createUser = function (req, res) {
// //     bcrypt.hash(req.body.password, 10, async (err, hash) => {
// //         if (err) {
// //             return res.status(500).json({
// //                 error: err
// //             })
// //         }
// //         else {
// //             const { username, email, password } = req.body
// //             // FUNCTION TO MAKE THE EMAIL ENTER ONLY ONCE IN THE DATABASE
// //             let user_exist = await User.findOne({ email: email });
// //             if (user_exist) {
// //                 res.json({
// //                     success: false,
// //                     message: "EMAIL already exists"
// //                 })
// //             }
// //             else {
// //                 let size = 200;
// //                 let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
// //                 const user = new User({
// //                     _id: new mongoose.Types.ObjectId,
// //                     password: hash,
// //                     username: req.body.username,
// //                     email: req.body.email,
// //                     avatar: avatar

// //                 });
// //                 const token = jwt.sign({
// //                     username: username,
// //                     email: email,
// //                     avatar: avatar
// //                 },
// //                     "This is secret key",   //this key is to be used in check_auth file for verification in verify function
// //                     {
// //                         expiresIn: '24h'
// //                     });

// //                 user.save()
// //                     .then(result => {
// //                         console.log(result);
// //                         res.status(200).json({
// //                             newUser: result,
// //                             token: token
// //                         });
// //                     })
// //                     .catch(err => {
// //                         console.log(err);
// //                         res.status(500).json({
// //                             Error: err
// //                         });
// //                     });
// //             }


// //         }
// //     })
// // };

// // // FUNCTION FOR LOGGING IN USER (REQUIRES JWT INSTALLASTION)
// // module.exports.loginUser = function (req, res) {

// //     User.find({ email: req.body.email }).exec()
// //         .then(user => {
// //             if (user.length < 1) {
// //                 res.status(500).json({
// //                     errr: "user not found"
// //                 })
// //             }
// //             bcrypt.compare(req.body.password, user[0].password, (err, result) => {
// //                 if (!result) {
// //                     return res.status(500).json({
// //                         errr: "Incorrect Password"
// //                     })
// //                 }
// //                 if (result) {
// //                     // if result match then create the token
// //                     let size=200;
// //                 let avatar = "https://gravatar.com/avatar/?s=" + size + '&d=retro';
// //                     console.log("User logged in");
// //                     const token = jwt.sign({
// //                         username: user[0].username,
// //                         email: user[0].email,
// //                         avatar:avatar

// //                     },
// //                         "This is secret key",   //this key is to be used in check_auth file for verification in verify function
// //                         {
// //                             expiresIn: '24h'
// //                         });
// //                     res.status(200).json({
// //                         message: "User logged in",
// //                         username: user[0].username,
// //                         email: user[0].email,
// //                         avatar: avatar[0].avatar,
// //                         token: token
// //                     })

// //                 }
// //             })
// //         })
// //         .catch(err => {
// //             res.status(500).json({
// //                 error: err
// //             })
// //         })

// // }

// // module.exports.getUser = function (req, res) {
// //     User.findById(req.params.id)
// //         .then(result => {
// //             console.log(result);
// //             res.status(200).json({
// //                 user: result
// //             });
// //         })
// //         .catch(err => {
// //             console.log(err);
// //             res.status(500).json({
// //                 Error: err
// //             });
// //         });

// // };

// // // TO DELETE THE IMAGE FROM THE CLOUDNIARY AS WELL AS FROM MONGODB USE THIS METHOD
// // // QUERY is used for deleteing the image from cloudinary using & , ?

// // // http:// localhost:3000/users?id="123456" & imageURL=" "
// // // using split() method to get the imageURL from the URL query

// // module.exports.deleteData = function (req, res) {
// //     const imageURL = req.query.imageURL;
// //     const urlarr = imageURL.split("/")
// //     const image = urlarr[urlarr.length - 1];
// //     const Imagename = image.split(".")[0];

// //     const userID = req.query.ID;
// //     User.remove({ _id: userID }).
// //         then(result => {

// //             cloudinary.uploader.destroy(Imagename, (err, result) => {
// //                 console.log(err, result);
// //             })
// //             res.status(200).json({
// //                 message: result
// //             })
// //         }).catch(error => {
// //             res.status(500).json({
// //                 err: err
// //             })
// //         })
// // }



// // module.exports.deleteUser = function (req, res) {
// //     User.remove({ _id: req.params.id })
// //         .then(result => {
// //             console.log("user Deleted");
// //             res.status(200).json({
// //                 messsage: 'id deleted',
// //                 result: result
// //             });
// //         })
// //         .catch(err => {
// //             console.log(err);
// //             res.status(500).json({
// //                 Error: err
// //             });
// //         });

// // };

// // module.exports.UpdateUser = function (req, res) {
// //     User.findOneAndUpdate({ _id: req.params.id }, {
// //         $set: {
// //             firstName: req.body.firstName,
// //             lastName: req.body.lastName,

// //         }
// //     })
// //         .then(result => {
// //             console.log("user Updated");
// //             res.status(200).json({
// //                 messsage: 'user Updated',
// //                 updated_user: result    //the result will not be the updated value but the previous value
// //                 //but the id got updated
// //             });
// //         })
// //         .catch(err => {
// //             console.log(err);
// //             res.status(500).json({
// //                 Error: err
// //             });
// //         });

// // };

// // // 