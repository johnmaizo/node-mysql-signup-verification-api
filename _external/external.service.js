const axios = require("axios");
const {catchError, map} = require("rxjs/operators");
const {from, lastValueFrom} = require("rxjs"); // Use 'from' to wrap promises properly in observables
const {HttpException} = require("./httpException"); // Create a custom error handler or use a library
require("dotenv").config();

class ExternalService {
  constructor() {
    this.logger = console;
  }

  async getDatas() {
    const url = process.env.EXTERNAL_ENDPOINT;

    const request = from(axios.get(url)).pipe(
      // Use 'from' instead of 'of'
      map((response) => {
        if (response.data) {
          return response.data;
        } else {
          throw new HttpException("No Results in response", 500);
        }
      }),
      catchError((err) => {
        this.logger.error(err);
        throw new HttpException("Bad Request", 400);
      })
    );

    try {
      const extResponse = await lastValueFrom(request);
      const dataList = extResponse["Results"];
    //   console.log("dataList...", dataList);
      return dataList;
    } catch (error) {
      this.logger.error("Error fetching data", error);
      throw error;
    }
  }
}

module.exports = ExternalService;
