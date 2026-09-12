import { Router } from "express";
import { handleAmazonCallback } from "../controllers/amazonController";

const router = Router();

// Handles both GET (Amazon browser redirect) and POST (API test/exchange)
router.get("/callback", handleAmazonCallback);
router.post("/callback", handleAmazonCallback);

// Also handle root if mounted directly at /amazon/callback
router.get("/", handleAmazonCallback);
router.post("/", handleAmazonCallback);

export default router;
