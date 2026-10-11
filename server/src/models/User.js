import mongoose from 'mongoose';
import { env } from '../config/env.js';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    encryption: {
      kdf: {
        type: String,
        default: 'PBKDF2-SHA256'
      },
      kdfParams: {
        iterations: {
          type: Number,
          default: 600000
        }
      },
      salt: {
        type: String,
        default: null
      },
      wrappedCheck: {
        type: String,
        default: null
      }
    },
    storageQuotaBytes: {
      type: Number,
      default: env.DEFAULT_USER_QUOTA_BYTES
    },
    storageUsedBytes: {
      type: Number,
      default: 0
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Method to safely serialize user profile for client responses (excludes sensitive fields)
UserSchema.methods.toClientJSON = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    storageQuotaBytes: this.storageQuotaBytes,
    storageUsedBytes: this.storageUsedBytes,
    encryptionSetup: Boolean(this.encryption?.salt && this.encryption?.wrappedCheck),
    createdAt: this.createdAt
  };
};

export const User = mongoose.model('User', UserSchema);
