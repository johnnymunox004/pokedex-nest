import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PokemonModule } from './pokemon/pokemon.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { SeedModule } from './seed/seed.module';
import { ConfigModule } from "@nestjs/config";
import { EnvCnfiguration } from './common/config/env.config';
import { JoiValidationSchema } from './common/config/joi.validation';


@Module({
  imports: [
    ConfigModule.forRoot(
      {
        load: [EnvCnfiguration],
        validationSchema: JoiValidationSchema,
      }
    ),

    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),

    MongooseModule.forRoot(process.env.MONGODB_URI!, { dbName: 'pokemonsdb' }),

    PokemonModule,

    CommonModule,

    SeedModule,
  ],
})
export class AppModule {
  constructor() {
    // console.log(process.env);
  }
}
