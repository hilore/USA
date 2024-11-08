import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_TOKEN } from "../common/consts";
import { TokenType } from "../common/types";
import { tokensTable } from "../drizzle/schema";
import { JWT_CONF_KEY, JWTConfigType } from "../../configs";

@Injectable()
export class TokenService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
  ) {}

  get ttl(): number {
    return this.config.get<JWTConfigType>(JWT_CONF_KEY, { infer: true })
      .expiresIn;
  }

  async saveToken(userId: number, refreshToken: string): Promise<TokenType> {
    let tokenData = await this.findTokenByUserId(userId);

    if (tokenData) {
      await this.db
        .update(tokensTable)
        .set({ refreshToken })
        .where(eq(tokensTable.userId, userId));

      let tokenData = await this.findTokenByUserId(userId);
      return tokenData!;
    }

    await this.db.insert(tokensTable).values({ refreshToken, userId });
    const token = await this.findTokenByUserId(userId);

    return token!;
  }

  async removeToken(refreshToken: string): Promise<void> {
    await this.db
      .delete(tokensTable)
      .where(eq(tokensTable.refreshToken, refreshToken));
  }

  async findTokenByUserId(userId: number): Promise<TokenType | null> {
    const [token, ...rest] = await this.db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.userId, userId));
    if (!token) {
      return null;
    }

    return token;
  }

  async findTokenByToken(refreshToken: string): Promise<TokenType | null> {
    const [token, ...rest] = await this.db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.refreshToken, refreshToken));
    if (!token) {
      return null;
    }

    return token;
  }
}
