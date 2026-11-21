import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { ConsumablesController } from './consumables.controller';
import { ConsumablesService } from './consumables.service';

@Module({
  imports: [AuthModule, JwtModule.register({})],
  controllers: [ConsumablesController],
  providers: [ConsumablesService],
})
export class ConsumablesModule {}
