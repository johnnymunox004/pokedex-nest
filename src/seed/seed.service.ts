import { Injectable } from '@nestjs/common';
import { PokeResponse } from './interface/poke-response.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Pokemon } from 'src/pokemon/entities/pokemon.entity';
import { Model } from 'mongoose';
import { AxiosAdapter } from 'src/common/adapter/axios.adapter';

@Injectable()
export class SeedService {
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly http: AxiosAdapter
  ) {}


  async executeSeed() {
    await this.pokemonModel.deleteMany({});

    const  data  = await this.http.get<PokeResponse>(
      'https://pokeapi.co/api/v2/pokemon?limit=60',
    );

    const pokemonToInsert: { name: string; no: number }[] = [];

    data.results.forEach(async ({ name, url }) => {
      const segments = url.split('/');
      const no = +segments[segments.length - 2];

      pokemonToInsert.push({ name, no });
    });
    await this.pokemonModel.insertMany(pokemonToInsert);
    return `seed executed`;
  }

























////////////////////////una forma de insertar todos los pokemones a la bd menos optima








  // async executeSeed() {
  //   await this.pokemonModel.deleteMany({});

  //   const { data } = await this.axios.get<PokeResponse>(
  //     'https://pokeapi.co/api/v2/pokemon?limit=6',
  //   );

  //   const insertPromisesArray: Promise<Pokemon>[] = [];

  //   data.results.forEach(async ({ name, url }) => {
  //     const segments = url.split('/');
  //     const no = +segments[segments.length - 2];

  //     insertPromisesArray.push(this.pokemonModel.create({ name, no }));
  //   });
  //   await Promise.all(insertPromisesArray);
  //   return `seed executed`;
  // }
}
