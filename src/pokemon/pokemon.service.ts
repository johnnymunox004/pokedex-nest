import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { isValidObjectId, Model } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private defaultlimit: number;

  constructor(
    // me da acceso a los parametros que espera el schema para mongo db
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,

    private readonly configservice: ConfigService,
  ) {
    this.defaultlimit = configservice.get<number>('defaultlimit')!;
  }
  //////////////////////////////////////////////////////////////////////////////////////
  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase();

    try {
      //
      const pokemon = await this.pokemonModel.create(createPokemonDto);
      return pokemon;
    } catch (error) {
      this.handleExceptions(error);
    }
  }
  //////////////////////////////////////////////////////////////////////////////////////////////
  findAll(PaginationDto: PaginationDto) {
    const { limit = this.defaultlimit, offset = 0 } = PaginationDto;

    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({
        no: 1,
      }) // para mostrarlos de manera acendente
      .select('-__v'); // para ocultar el contenido de version
  }
  /////////////////////////////////////////////////////////////////////////////////////////////
  async findOne(term: string): Promise<Pokemon> {
    let pokemon: Pokemon | null = null;

    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: +term });
    }

    // mongoid o term
    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term);
    }
    // name
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({
        name: term.toLocaleLowerCase().trim(),
      });
    }

    if (!pokemon)
      throw new BadRequestException(
        `No se encontró el Pokémon con el término: ${term}`,
      );

    return pokemon;
  }
  ///////////////////////////////////////////////////////////////////////////////////////////
  async update(term: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(term);

    if (updatePokemonDto.name)
      updatePokemonDto.name = updatePokemonDto.name.toLowerCase();
    try {
      await pokemon.updateOne(updatePokemonDto);
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleExceptions(error);
    }
  }
  ///////////////////////////////////////////////////////////////////////////////////////////
  async remove(id: string) {
    // const pokemon = await this.findOne(id);
    // await pokemon.deleteOne();
    // return { id };

    // const result = await this.pokemonModel.findByIdAndDelete(id);

    //// elimina por id y consulta si esta en la bd con una sola solicitud
    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id });

    if (deletedCount === 0)
      throw new BadRequestException(
        `No se encontró el Pokémon con el id: ${id}`,
      );
    return;
  }
  /////////////////////////////////////////////////////////////////////////////////////
  private handleExceptions(error: any) {
    if (error.code === 11000) {
      throw new BadRequestException(
        `Pokemon ya existe ${JSON.stringify(error.keyValue)}`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Error creando Pokemon`);
  }
}
