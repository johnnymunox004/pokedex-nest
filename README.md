<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>


# ejecutar en desarrollo

1. clonar el repositorio
2. ejecutar el siguiente comando para instalar las dependencias

```
yarn intall
```
3. tener nest cli instalado
```
yarn global add @nestjs/cli
```

4. levantar la base de datos
```
docker-compose up -d
```

5. llenar la base de datos con data de prueba
```
GET http://localhost:3000/api/v2/seed
```

## Flujo NestJS + Mongoose (Guía de referencia)

### Arquitectura del flujo CRUD:
```
HTTP Request → Controller → DTO (validación) → Service → MongoDB → Response
```

### 1. POST - Crear Pokemon
```typescript
// Controller recibe HTTP POST
@Controller('pokemon')
export class PokemonController {
  @Post()
  create(@Body() createPokemonDto: CreatePokemonDto) {  // ← DTO valida aquí
    return this.pokemonService.create(createPokemonDto);  // ← llama al service
  }
}

// DTO valida los datos del body
export class CreatePokemonDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  no: number;  // ← valida que sea número entero positivo

  @IsString()
  @MinLength(1)
  name: string;  // ← valida que sea string no vacío
}

// Service usa el modelo para guardar en MongoDB
@Injectable()
export class PokemonService {
  constructor(
    @InjectModel(Pokemon.name)
    private pokemonModel: Model<Pokemon>,
  ) {}

  async create(createPokemonDto: CreatePokemonDto) {
    try {
      // AQUÍ SE GUARDA EN LA BASE DE DATOS
      const pokemon = await this.pokemonModel.create({
        name: createPokemonDto.name.toLowerCase(),
        no: createPokemonDto.no
      });
      return pokemon;
    } catch (error) {
      this.handleExceptions(error);
    }
  }
}
```

### 2. GET - Buscar Pokemon
```typescript
// Controller recibe HTTP GET
@Controller('pokemon')
export class PokemonController {
  @Get(':term')
  findOne(@Param('term') term: string) {  // ← term viene de la URL
    return this.pokemonService.findOne(term);  // ← llama al service
  }

  @Get()
  findAll() {
    return this.pokemonService.findAll();
  }
}

// Service busca en MongoDB
@Injectable()
export class PokemonService {
  async findOne(term: string): Promise<Pokemon | null> {
    let pokemon: Pokemon | null = null;

    // BUSCAR POR NÚMERO
    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: +term });
    }

    // BUSCAR POR NOMBRE si no encontró por número
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ 
        name: term.toLowerCase().trim() 
      });
    }

    return pokemon;
  }

  async findAll() {
    // BUSCAR TODOS LOS DOCUMENTOS
    return await this.pokemonModel.find();
  }
}
```

### 3. PATCH - Actualizar Pokemon
```typescript
// Controller recibe HTTP PATCH
@Controller('pokemon')
export class PokemonController {
  @Patch(':term')
  update(@Param('term') term: string, @Body() updatePokemonDto: UpdatePokemonDto) {
    return this.pokemonService.update(term, updatePokemonDto);
  }
}

// Service actualiza en MongoDB
@Injectable()
export class PokemonService {
  async update(term: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(term);
    
    if (!pokemon) {
      throw new NotFoundException(`Pokemon con "${term}" no encontrado`);
    }

    if (updatePokemonDto.name) {
      updatePokemonDto.name = updatePokemonDto.name.toLowerCase();
    }

    try {
      // ACTUALIZAR EN LA BASE DE DATOS
      await pokemon.updateOne(updatePokemonDto);
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleExceptions(error);
    }
  }
}
```

### 4. DELETE - Eliminar Pokemon
```typescript
// Controller recibe HTTP DELETE
@Controller('pokemon')
export class PokemonController {
  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.pokemonService.remove(id);
  }
}

// Service elimina de MongoDB
@Injectable()
export class PokemonService {
  async remove(id: string) {
    // ELIMINAR DE LA BASE DE DATOS
    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id });

    if (deletedCount === 0) {
      throw new BadRequestException(`Pokemon con id "${id}" no encontrado`);
    }

    return { message: 'Pokemon eliminado correctamente' };
  }
}
```

### Entity (Schema de MongoDB)
```typescript
@Schema()
export class Pokemon extends Document {
  @Prop({
    unique: true,
    index: true,
  })
  name: string;

  @Prop({
    unique: true,
    index: true,
  })
  no: number;

  @Prop({
    default: Date.now,
  })
  date: Date;
}

export const PokemonSchema = SchemaFactory.createForClass(Pokemon);
```

### Configuración de módulos
```typescript
// Pokemon Module
@Module({
  controllers: [PokemonController],
  providers: [PokemonService],
  imports: [
    MongooseModule.forFeature([
      { name: Pokemon.name, schema: PokemonSchema }
    ]),
  ],
  exports: [MongooseModule],
})
export class PokemonModule {}

// App Module
@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB),
    PokemonModule,
    SeedModule,
  ],
})
export class AppModule {}
```

### Puntos clave:
- **@Injectable** → marca una clase como provider inyectable
- **@InjectModel(Pokemon.name)** → inyecta el modelo de Mongoose
- **Pokemon.name** → devuelve "Pokemon" (identificador del modelo)
- **DTO** → solo validación, NO guarda en BD
- **Service** → donde se ejecutan las operaciones de MongoDB
- **Entity** → define la estructura/schema de los documentos

## Patrón Adapter para HTTP (Guía de referencia)

### ¿Por qué usar el patrón Adapter?
- **Desacopla** tu código de librerías específicas (axios, fetch, etc.)
- **Facilita testing** → puedes mockear el adapter fácilmente
- **Permite cambiar** de librería HTTP sin afectar el resto del código
- **Estandariza** la interfaz para todas las llamadas HTTP

### Flujo del Adapter Pattern:
```
Service → HttpAdapter Interface → Axios Adapter → Axios Library → API Externa
```

### 1. Definir la interfaz (contrato)
```typescript
// src/common/interfaces/http-adapter.interface.ts
export interface HttpAdapter {
  get<T>(url: string): Promise<T>;
  // post<T>(url: string, data: any): Promise<T>;
  // put<T>(url: string, data: any): Promise<T>;
  // delete<T>(url: string): Promise<T>;
}
```

### 2. Implementar el adaptador con Axios
```typescript
// src/common/adapter/axios.adapter.ts
import axios, { AxiosInstance } from 'axios';
import { HttpAdapter } from '../interfaces/http-adapter.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AxiosAdapter implements HttpAdapter {
  private axios: AxiosInstance = axios;

  async get<T>(url: string): Promise<T> {
    try {
      const { data } = await this.axios.get<T>(url);
      return data;  // Solo retorna el data, no toda la respuesta
    } catch (error) {
      console.error('HTTP Error:', error.message);
      throw new Error(`Error fetching data from ${url}`);
    }
  }

  // Opcional: más métodos HTTP
  async post<T>(url: string, body: any): Promise<T> {
    try {
      const { data } = await this.axios.post<T>(url, body);
      return data;
    } catch (error) {
      throw new Error(`Error posting to ${url}`);
    }
  }
}
```

### 3. Registrar el adaptador en un módulo común
```typescript
// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { AxiosAdapter } from './adapter/axios.adapter';

@Module({
  providers: [AxiosAdapter],
  exports: [AxiosAdapter],  // Exporta para que otros módulos lo usen
})
export class CommonModule {}
```

### 4. Usar el adaptador en servicios
```typescript
// src/seed/seed.service.ts
import { Injectable } from '@nestjs/common';
import { AxiosAdapter } from 'src/common/adapter/axios.adapter';

@Injectable()
export class SeedService {
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly http: AxiosAdapter  // ← Inyecta el adaptador
  ) {}

  async executeSeed() {
    // Usa la interfaz, no directamente axios
    const data = await this.http.get<PokeResponse>(
      'https://pokeapi.co/api/v2/pokemon?limit=60'
    );

    const pokemonToInsert: { name: string; no: number }[] = [];

    data.results.forEach(({ name, url }) => {
      const segments = url.split('/');
      const no = +segments[segments.length - 2];
      pokemonToInsert.push({ name, no });
    });

    await this.pokemonModel.insertMany(pokemonToInsert);
    return 'Seed ejecutada';
  }
}
```

### 5. Importar CommonModule en módulos que lo necesiten
```typescript
// src/seed/seed.module.ts
@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    PokemonModule,
    CommonModule,  // ← Importa para usar AxiosAdapter
  ]
})
export class SeedModule {}
```

### Ventajas del patrón implementado:

1. **Flexibilidad**: Cambiar de axios a fetch requiere solo crear otro adaptador
```typescript
// src/common/adapter/fetch.adapter.ts
@Injectable()
export class FetchAdapter implements HttpAdapter {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }
}
```

2. **Testing fácil**: Mock del adaptador sin depender de axios
```typescript
const mockHttpAdapter = {
  get: jest.fn().mockResolvedValue({ results: mockPokemonData })
};
```

3. **Type Safety**: `<T>` genérico mantiene tipado fuerte
```typescript
const pokemons = await this.http.get<Pokemon[]>('/pokemon');  // T = Pokemon[]
const response = await this.http.get<PokeResponse>('/search'); // T = PokeResponse
```

4. **Manejo de errores centralizado**: Un solo lugar para manejar errores HTTP

### Patrón de uso recomendado:
```typescript
// ❌ MAL: Usar axios directamente
import axios from 'axios';
const data = await axios.get('url');

// ✅ BIEN: Usar a través del adaptador
constructor(private readonly http: AxiosAdapter) {}
const data = await this.http.get<ExpectedType>('url');
```

## Paginación con Query Parameters (Guía de referencia)

### ¿Por qué implementar paginación?
- **Performance** → evita cargar miles de registros de una vez
- **UX** → respuesta más rápida al usuario
- **Recursos** → menos uso de memoria y ancho de banda
- **Escalabilidad** → la app funciona bien con grandes datasets

### Flujo de paginación:
```
URL Query → Controller → DTO (validación) → Service → MongoDB → Response paginada
```

### 1. DTO de paginación (validación de parámetros)
```typescript
// src/common/dto/pagination.dto.ts
import { IsOptional, IsPositive, Min } from "class-validator";

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @Min(1)
  limit?: number;  // ← cantidad de registros por página

  @IsOptional()
  @IsPositive()
  offset?: number;  // ← registros a omitir (saltar)
}
```

### 2. Controller recibe query parameters
```typescript
// src/pokemon/pokemon.controller.ts
@Controller('pokemon')
export class PokemonController {
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    // URL: GET /pokemon?limit=5&offset=10
    return this.pokemonService.findAll(paginationDto);
  }
}
```

### 3. Service implementa la lógica de paginación
```typescript
// src/pokemon/pokemon.service.ts
@Injectable()
export class PokemonService {
  private defaultlimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configservice: ConfigService,
  ) {
    this.defaultlimit = configservice.get<number>('defaultlimit')!;
  }

  findAll(paginationDto: PaginationDto) {
    const { limit = this.defaultlimit, offset = 0 } = paginationDto;

    return this.pokemonModel.find()
      .limit(limit)     // ← cuántos registros devolver
      .skip(offset)     // ← cuántos registros saltar
      .sort({ no: 1 })  // ← ordenar ascendente por número
      .select('-__v');  // ← ocultar campo de versión de Mongoose
  }
}
```

### 4. Configuración de valores por defecto
```typescript
// src/common/config/env.config.ts
export const EnvCnfiguration = () => ({
  defaultlimit: +(process.env.DEFAULT_LIMIT || '6')  // ← valor por defecto desde .env
})

// .env
DEFAULT_LIMIT=12
```

### Ejemplos de uso en URLs:

```bash
# Página 1 (primeros 10 registros)
GET /api/v2/pokemon?limit=10&offset=0

# Página 2 (registros 11-20)
GET /api/v2/pokemon?limit=10&offset=10

# Página 3 (registros 21-30)
GET /api/v2/pokemon?limit=10&offset=20

# Solo usar límite (desde el inicio)
GET /api/v2/pokemon?limit=5

# Usar configuración por defecto
GET /api/v2/pokemon
```

### Cálculo de páginas:
```typescript
// Frontend: calcular offset basado en página
const page = 2;        // página deseada
const limit = 10;      // registros por página
const offset = (page - 1) * limit;  // offset = 10

// Backend: validaciones útiles
const maxLimit = 100;  // prevenir requests muy grandes
const safeLimit = Math.min(limit || defaultLimit, maxLimit);
```

### Respuesta mejorada (opcional):
```typescript
// Service con metadata de paginación
findAll(paginationDto: PaginationDto) {
  const { limit = this.defaultlimit, offset = 0 } = paginationDto;

  const data = await this.pokemonModel.find()
    .limit(limit)
    .skip(offset)
    .sort({ no: 1 })
    .select('-__v');

  const total = await this.pokemonModel.countDocuments();

  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(total / limit),
    },
  };
}
```

### Ventajas del patrón implementado:
- ✅ **Flexible** → el cliente controla limit y offset
- ✅ **Validado** → DTO valida parámetros automáticamente
- ✅ **Configurable** → límite por defecto desde variables de entorno
- ✅ **Eficiente** → MongoDB skip/limit son nativos y optimizados
- ✅ **Opcional** → query parameters opcionales con valores por defecto