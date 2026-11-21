import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientEncountersService } from './patient-encounters.service';
import { ExternalMedicalRecordsService } from './external-medical-records.service';
import { PatientsService } from './patients.service';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [AuthModule, JwtModule.register({})],
  controllers: [PatientsController],
  providers: [PatientsService, PatientEncountersService, ExternalMedicalRecordsService],
})
export class PatientsModule {}
