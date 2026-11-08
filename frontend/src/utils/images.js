// The only way to build a product photo URL (handbook 9.1).
// productImage(product)    -> "/images/products/CRM-EM-1001/01.jpg" (photo 1, used on cards)
// productImage(product, 3) -> "/images/products/CRM-EM-1001/03.jpg" (gallery on the product page)
// Photos live in frontend/public/images/products/<serialNumber>/; a product has imageCount photos.
export function productImage(product, index = 1) {
  const number = String(index).padStart(2, '0');
  return `/images/products/${product.serialNumber}/${number}.jpg`;
}
