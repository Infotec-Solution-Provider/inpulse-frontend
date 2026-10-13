// A fixed response prevents blocked service paths from reaching dynamic tenant pages.
const blocked = () => new Response(null, { status: 404 });

export const GET = blocked;
export const HEAD = blocked;
export const POST = blocked;
export const PUT = blocked;
export const PATCH = blocked;
export const DELETE = blocked;
export const OPTIONS = blocked;
