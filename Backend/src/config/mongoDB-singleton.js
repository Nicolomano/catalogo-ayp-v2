import mongoose from "mongoose";
import Config from "./config.js";

export default class MongoDBSingleton {
  static #instance;

  constructor() {
    this.#connectMongoDB();
  }

  static getInstance() {
    if (this.#instance) {
      console.log("Instance already exists");
    } else {
      this.#instance = new MongoDBSingleton();
    }
    return this.#instance;
  }

  // Con `mongoose.connect` sin await, el catch y el process.exit eran código
  // muerto: una URI rota imprimía "MongoDB connected" igual, Railway veía el
  // deploy sano y cada ruta devolvía 500. Ahora falla ruidoso y sale con código
  // 1, para que la plataforma lo reinicie o marque el deploy como fallido.
  #connectMongoDB = async () => {
    try {
      await mongoose.connect(Config.mongoUri);
      console.log("MongoDB connected");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error.message);
      process.exit(1);
    }
  };
}
