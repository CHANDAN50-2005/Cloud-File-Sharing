import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    familyId: {
      type: String,
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    replacedBy: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: 'Unknown'
    },
    ip: {
      type: String,
      default: 'Unknown'
    }
  },
  {
    timestamps: true
  }
);

// Helper to check if token is actively usable
RefreshTokenSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt > new Date();
};

export const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
