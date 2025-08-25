import { IsInt, IsPositive, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePokemonDto {
  @Type(() => Number) // convierte valor del body a number
  @IsInt()
  @IsPositive()
  @Min(1)
   no: number;

  @IsString()
  @MinLength(1)
   name: string;
}
