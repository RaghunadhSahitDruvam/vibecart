import ProductCard from "@/components/shared/home/ProductCard";
import { getRelatedProductsBySubCategoryIds } from "@/lib/database/actions/product.actions";
import React from "react";

const SubCategoryProductsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const subCategoryName = (await searchParams).name || "";
  const id = [(await params).id];
  const products = await getRelatedProductsBySubCategoryIds(id).catch((err) =>
    console.log(err)
  );

  const transformedSubCategoryProducts = products?.products.map(
    (product: any) => ({
      id: product._id,
      name: product.name,
      category: product.category, // You might need to format this
      image: product.subProducts[0]?.images[0].url || "", // Adjust to match your image structure
      rating: product.rating,
      reviews: product.numReviews,
      price: product.subProducts[0]?.price || 0, // Adjust to match your pricing structure
      originalPrice: product.subProducts[0]?.originalPrice || 0, // Add logic for original price
      discount: product.subProducts[0]?.discount || 0,
      isBestseller: product.featured,
      isSale: product.subProducts[0]?.isSale || false, // Adjust if you have sale logic
      slug: product.slug,
      prices: product.subProducts[0]?.sizes
        .map((s: any) => {
          return s.price;
        })
        .sort((a: any, b: any) => {
          return a - b;
        }),
    })
  );
  return (
    <div>
      <ProductCard
        shop={true}
        products={transformedSubCategoryProducts}
        heading={`${(subCategoryName && subCategoryName) || "Products"}`}
      />
    </div>
  );
};

export default SubCategoryProductsPage;