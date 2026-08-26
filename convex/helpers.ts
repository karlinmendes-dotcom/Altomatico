import { query } from "./_generated/server";

// Query para obter settings - usada por actions do youtubeEngine
export const getDefaultSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userSettings").first();
  },
});
