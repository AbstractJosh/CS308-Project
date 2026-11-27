// FAKE DATA for the reviews on the product page (SCRUM-85). Owner: Sezin.
// The reviews API (Luis, Sprint 3) is not on develop yet. fakeReviewsApi answers the two calls of
// handbook 8.4 the way the page expects them; SCRUM-87 replaces it with the real API. Delete then.
//
// A review uses the same fields as Sidar's comment approval page (SCRUM-90):
//   { id, productId, customerName, rating, comment, status, createdAt }
// status is the comment's state: PENDING, APPROVED or REJECTED (handbook 6.3). comment may be null.
//
// GET  /products/:id/reviews -> { reviews, averageRating, ratingCount, myReview }
//   reviews: only APPROVED comments, newest first. averageRating and ratingCount use every
//   rating, because ratings are public at once (handbook 7.7). myReview: the logged-in
//   customer's own review or null.
// POST /products/:id/reviews { rating, comment } -> { review }

const FAKE_DELAY_MS = 300;

const seed = [
  { id: 8, productId: 3, customerName: 'Mert Aydın', rating: 5, comment: 'The assisted tamping really helps. My espresso tastes like the one at my favourite cafe.', status: 'APPROVED', createdAt: '2026-11-14T11:00:00.000Z' },
  { id: 5, productId: 3, customerName: 'Selin Öztürk', rating: 4, comment: 'Great machine for a first espresso setup. It takes some practice to get the grind right.', status: 'APPROVED', createdAt: '2026-11-10T09:30:00.000Z' },
  { id: 4, productId: 3, customerName: 'Burak Şahin', rating: 4, comment: null, status: null, createdAt: '2026-11-09T17:00:00.000Z' },
  { id: 3, productId: 3, customerName: 'Ayşe Koç', rating: 5, comment: 'Looks lovely on the counter too.', status: 'PENDING', createdAt: '2026-11-08T08:15:00.000Z' },
  { id: 10, productId: 40, customerName: 'Can Demir', rating: 2, comment: 'Grinds evenly but it takes a long time for a full cup. My arm got tired.', status: 'APPROVED', createdAt: '2026-11-16T08:05:00.000Z' },
  { id: 2, productId: 40, customerName: 'Elif Kaya', rating: 5, comment: 'Beautiful wood and a very even grind for my moka pot.', status: 'APPROVED', createdAt: '2026-11-05T12:00:00.000Z' },
];

// Kept in memory, so a new review stays until the page is reloaded.
let reviews = seed.map((review) => ({ ...review }));
let myReviews = {}; // productId -> the logged-in customer's review
let nextId = 100;

const wait = () => new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));

function summary(productId) {
  const forProduct = reviews.filter((r) => r.productId === productId);
  const ratingCount = forProduct.length;
  const total = forProduct.reduce((sum, r) => sum + r.rating, 0);
  return {
    reviews: forProduct
      .filter((r) => r.comment && r.status === 'APPROVED')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    averageRating: ratingCount ? Math.round((total / ratingCount) * 10) / 10 : 0,
    ratingCount,
    myReview: myReviews[productId] ?? null,
  };
}

export const fakeReviewsApi = {
  list: async (productId) => {
    await wait();
    return summary(Number(productId));
  },

  create: async (productId, { rating, comment }, customerName = 'You') => {
    await wait();
    const id = Number(productId);
    if (myReviews[id]) {
      throw Object.assign(new Error('You have already reviewed this product'), { status: 409 });
    }
    const text = comment?.trim() || null;
    const review = {
      id: nextId++,
      productId: id,
      customerName,
      rating,
      comment: text,
      // The rating is public at once; a comment waits for a product manager (handbook 7.7).
      status: text ? 'PENDING' : null,
      createdAt: new Date().toISOString(),
    };
    reviews = [review, ...reviews];
    myReviews = { ...myReviews, [id]: review };
    return { review };
  },
};

// For tests: start again from the seed data.
export function resetFakeReviews() {
  reviews = seed.map((review) => ({ ...review }));
  myReviews = {};
  nextId = 100;
}
