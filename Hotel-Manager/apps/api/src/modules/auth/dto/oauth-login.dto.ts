import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthLoginDto {
  /** ID token (JWT) returned to the browser by Google Identity Services / Sign in with Apple JS. */
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
