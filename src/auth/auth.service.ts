import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ChangePasswordDto } from './dto';
import { User } from './entities/User.entity';

@Injectable()
export class AuthService {
  private logger = new Logger('Auth Service');

  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {
  }

  async getAllUsers(req: any): Promise<any> {
    return this.userRepository.getAllUsers();
  }

  async getUser(req: any): Promise<any> {
    const { id } = req.user;
    const user = await this.userRepository.findOne({ id });
    this.logger.verbose(`User Logged In ${user.name}`);
    if (user) {
      const { password, ...result } = user;
      return {
        success: true,
        message: 'Success',
        data: result,
      };
    }
    throw new UnauthorizedException();
  }


  async register(data: any): Promise<any> {
    try {
      if (data.password != data.confirmPassword) {
        return {
          success: false,
          message: 'Error',
          data: {
            confirmPassword: 'Password and confirm password must be same',
          },
        };
      }
      const user = await this.userRepository.findOne({ email: data.email });
      if (!user) {
        data.password = await bcrypt.hash(data.password, 10);
        data.status = 'ACTIVE';
        const registerUser = await this.userRepository.save(data);
        const { password, ...result } = registerUser;
        return {
          success: true,
          message: 'Success',
          data: result,
        };
      }
      return {
        success: false,
        message: 'Error',
        data: {
          email: 'user already exists, Please login',
        },
      };
    } catch (e) {
      return {
        success: false,
        message: 'Something Went wrong ... Registration Failed',
      };
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ email });
      if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          return user;
        }
      }
      return null;
    } catch (err) {
      global.console.log('err', err);
      return {
        success: false,
        message: 'Something went wrong..! Login failed.',
      };
    }
  }

  async login(user: any, body: any) {
    const { email, id } = user;
    const payload = { email, id };
    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/camelcase
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(user: User, data: ChangePasswordDto): Promise<any> {
    const id = user.id;
    const found = await this.userRepository.findOne({id});
    const match = await bcrypt.compare(data.currentPassword
     , found.password);
    if(!match) {
      return {
        success: false,
        message: 'Error',
        data: {
          confirmPassword: 'Current Password is incorrect'
        },
      }
    }
    if(data.password === data.confirmPassword){
      user.password = await bcrypt.hash(data.password, 10);
      await this.userRepository.save(user);
      return {
        success: true,
        message: 'Success'
      };
    }
    return {
      success: false,
    message: 'Error',
      data: {
        confirmPassword: 'Password and confirm Password must be same'
      },
    };
  }
}
