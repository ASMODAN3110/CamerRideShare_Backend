import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MotosController } from './motos.controller';
import { MotosService } from './motos.service';

@Module({
  imports: [AuthModule],
  controllers: [MotosController],
  providers: [MotosService],
  exports: [MotosService],
})
export class MotosModule {}
