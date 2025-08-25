import { IsOptional, IsPositive, Min } from "class-validator";



// recordar que por defexto la url esta en string y debemos tranformar la data a number 
export class PaginationDto{


    @IsOptional()
    @IsPositive()
    @Min(1)
    limit?:number;

    @IsOptional()
    @IsPositive()
    offset?:number;
}

// el ? es para decir que es opcional 