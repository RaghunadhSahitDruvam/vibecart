"use server";
import { handleError } from "@/lib/utils";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME as string,
  api_key: process.env.CLOUNDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_SECRET as string,
});

// fetch all website banners
export const fetchAllWebsiteBanners = async () => {
  try {
    const result = await cloudinary.api.resources_by_tag("website_banners", {
      type: "upload",
      max_results: 100,
    });
    return result.resources;
  } catch (error) {
    handleError(error);
  }
};
// fetch all app banners
export const fetchAllAppBanners = async () => {
  try {
    const result = await cloudinary.api.resources_by_tag("app_banners", {
      type: "upload",
      max_results: 100,
    });
    return result.resources;
  } catch (error) {
    handleError(error);
  }
};