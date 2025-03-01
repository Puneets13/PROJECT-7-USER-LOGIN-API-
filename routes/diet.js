const express = require('express');
const router = express.Router();

const { checkauth } = require('../middleware/user_jwt.js');
const callbackFunctions = require('../controller/diet.js');

router.post('/createmonthlydietRecord',checkauth,callbackFunctions.createmonthlydietRecord); // daily scanner
router.post('/countDietOfStudent',callbackFunctions.countDietOfStudent);  // count diet of student for "all months" in a year
router.post('/countDietPerMonth',callbackFunctions.countDietPerMonth); // count diet of students per month
router.post('/countDietPerMonthForHostel',callbackFunctions.countDietPerMonthForHostel); // count diet for particular hostel
router.post('/generateInvoice',checkauth,callbackFunctions.generateInvoice); // count diet for particular hostel
router.post('/countExtrasPerMonthForHostel',callbackFunctions.countExtrasPerMonthForHostel); // count diet for particular hostel
router.post('/printConsumedItemsByStudent',callbackFunctions.printConsumedItemsByStudent); // count diet for particular hostel
router.post('/applyLeave',checkauth,callbackFunctions.applyLeave); // leave
router.post('/getDietRecordList',checkauth,callbackFunctions.getDietRecordList);
router.post('/messList',checkauth,callbackFunctions.messList);
router.post('/createExtraMealRecord',checkauth,callbackFunctions.getextrameal);
router.post('/getLeaveRecord',checkauth,callbackFunctions.getLeaveRecord);


module.exports = router;