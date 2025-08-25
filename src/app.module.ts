import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PokemonModule } from './pokemon/pokemon.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),

    MongooseModule.forRoot("mongodb+srv://mr1773393:123@cluster0.i8t7e6o.mongodb.net/"),

    PokemonModule,

    CommonModule,

    SeedModule,
  ],
})
export class AppModule {}
