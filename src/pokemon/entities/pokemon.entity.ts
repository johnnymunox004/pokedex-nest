import { Prop, Schema, SchemaFactory,  } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Pokemon extends Document {
  // el id lo la da mongo db automaticamente

  @Prop({
    unique: true,    // el numero es unico como indice
    index:true,
  })
  name: string;



   @Prop({
    unique: true,
    index:true,
  })
  no: number;
}

export const PokemonSchema = SchemaFactory.createForClass(Pokemon);
