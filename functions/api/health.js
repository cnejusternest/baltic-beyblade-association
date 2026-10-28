
export async function onRequestGet(context) {
  try {
    const result = await context.env.DB
      .prepare("SELECT 1 AS connected")
      .first();

    return Response.json({
      status: "online",
      database: result?.connected === 1 ? "connected" : "error"
    });
  } catch (error) {
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 500 }
    );
  }
}
