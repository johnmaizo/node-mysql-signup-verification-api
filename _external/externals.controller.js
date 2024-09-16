// externalController.js

const express = require("express");
const router = express.Router();
const ExternalService = require("./external.service");
const externalService = new ExternalService();

/**
 * GET datas from external endpoint
 * @returns datas
 */
router.get("/datas", async (req, res) => {
  try {
    // const newDatas = [];
    const testData = await externalService.getDatas();
    // console.log("getDatas...", testData);
    // newDatas.push(testData);

    // You can manipulate data here as needed
    // testData.forEach((element) => {
    //     newDatas.push(element);
    // });

    // res.json(newDatas);
    res.json(testData);
  } catch (error) {
    res.status(500).json({error: "Failed to fetch data"});
  }
});

module.exports = router;
