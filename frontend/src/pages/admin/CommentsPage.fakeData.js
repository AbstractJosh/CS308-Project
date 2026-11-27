export const fakeComments = [
  {
    id: 12,
    productId: 9,
    productName: 'Jura E6 Piano Black',
    customerName: 'Demo Customer',
    rating: 5,
    comment: 'Makes a great flat white every morning. Cleaning is easier than I expected.',
    status: 'PENDING',
    createdAt: '2026-11-17T09:12:00.000Z',
  },
  {
    id: 11,
    productId: 25,
    productName: 'Bialetti Moka Express 1 Cup',
    customerName: 'Elif Kaya',
    rating: 4,
    comment: 'Small and strong coffee, just right for one person. The handle gets a little warm.',
    status: 'PENDING',
    createdAt: '2026-11-16T18:40:00.000Z',
  },
  {
    id: 10,
    productId: 40,
    productName: 'Zassenhaus Manaos Hand Grinder',
    customerName: 'Can Demir',
    rating: 2,
    comment: 'Grinds evenly but it takes a long time for a full cup. My arm got tired.',
    status: 'PENDING',
    createdAt: '2026-11-16T08:05:00.000Z',
  },
  {
    id: 9,
    productId: 34,
    productName: 'Hola Sol Turkish Coffee 250 g',
    customerName: 'Zeynep Arslan',
    rating: 5,
    comment: 'Fresh and smells wonderful. The foam comes out thick every time.',
    status: 'PENDING',
    createdAt: '2026-11-15T20:30:00.000Z',
  },
  {
    id: 8,
    productId: 3,
    productName: 'Sage The Barista Express Impress',
    customerName: 'Mert Aydın',
    rating: 5,
    comment: 'The assisted tamping really helps. My espresso tastes like the one at my favourite cafe.',
    status: 'APPROVED',
    createdAt: '2026-11-14T11:00:00.000Z',
  },
  {
    id: 7,
    productId: 24,
    productName: 'Leggno Gourmet Pro Turkish Coffee Machine Black',
    customerName: 'Deniz Yıldız',
    rating: 3,
    comment: 'Brews good Turkish coffee, but it is a bit loud and the pot is small.',
    status: 'APPROVED',
    createdAt: '2026-11-13T15:45:00.000Z',
  },
  {
    id: 6,
    productId: 50,
    productName: 'Sage The Force Gauge Tamper 58 mm',
    customerName: 'Ali Çelik',
    rating: 1,
    comment: 'Whoever packed my order is clueless. Your whole team should be ashamed of themselves.',
    status: 'REJECTED',
    createdAt: '2026-11-12T10:20:00.000Z',
  },
];

let comments = [];

export function resetFakeComments() {
  comments = fakeComments.map((comment) => ({ ...comment }));
}

resetFakeComments();

export const fakeAdminCommentsApi = {
  list: async (status) => ({
    comments: comments
      .filter((comment) => status === undefined || comment.status === status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  }),
  decide: async (id, status) => {
    const index = comments.findIndex((item) => String(item.id) === String(id));
    if (index === -1) throw Object.assign(new Error('Comment not found'), { status: 404 });
    const comment = { ...comments[index], status };
    comments[index] = comment;
    return { comment };
  },
};
