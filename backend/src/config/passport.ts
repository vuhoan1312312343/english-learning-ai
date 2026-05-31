import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.model';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if email already exists
          const existingUser = await User.findOne({ 
            email: profile.emails?.[0]?.value 
          });

          if (existingUser) {
            // Update existing user with Google ID
            existingUser.googleId = profile.id;
            existingUser.avatar = existingUser.avatar || profile.photos?.[0]?.value;
            user = await existingUser.save();
          } else {
            // Create new user
            user = await User.create({
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              googleId: profile.id,
            });
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
