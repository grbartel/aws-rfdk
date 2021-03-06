/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bucket } from '@aws-cdk/aws-s3';
import { Construct } from '@aws-cdk/core';

import {
  IPatchVersion,
  IVersion,
  PlatformInstallers,
} from './version-ref';

/**
 * Properties for the Deadline Version
 */
export interface VersionQueryProps {
  /**
   * String containing the complete or partial deadline version.
   *
   * @default - the latest available version of deadline installer.
   */
  readonly version?: string;
}

/**
 * The abstract class for new or imported(custom) Deadline Version.
 */
abstract class VersionQueryBase extends Construct implements IVersion {
  protected static readonly INSTALLER_BUCKET = 'thinkbox-installers';

  /**
   * @inheritdoc
   */
  public abstract readonly majorVersion: number;

  /**
   * @inheritdoc
   */
  public abstract readonly minorVersion: number;

  /**
   * @inheritdoc
   */
  public abstract readonly releaseVersion: number;

  /**
   * @inheritdoc
   */
  public abstract readonly linuxInstallers?: PlatformInstallers;

  /**
   * @inheritdoc
   */
  public linuxFullVersionString(): string | undefined {
    if (!this.linuxInstallers) {
      return undefined;
    }
    return this.fullVersionString(this.linuxInstallers.patchVersion);
  }

  protected fullVersionString(patchVersion: number): string {
    return `${this.releaseVersionString}.${patchVersion}`;
  }

  /**
   * Helper to concatenate the major, minor, and release version values into a release version string.
   */
  protected get releaseVersionString(): string {
    return `${this.majorVersion}.${this.minorVersion}.${this.releaseVersion}`;
  }
}

/**
 * This class encapsulates information about a particular version of Thinkbox's Deadline software.
 * Information such as the version number, and where to get installers for that version from Amazon S3.
 *
 * The version of an official release of Deadline is always four numeric version components separated by dots.
 * ex: 10.1.8.5. We refer to the components in this version, in order from left-to-right, as the
 * major, minor, release, and patch versions. For example, Deadline version 10.1.8.5 is majorVersion 10, minorVersion 1,
 * releaseVersion 8, and patchVersion 5.
 *
 * All of the installers provided by an instance of this class must be for the same Deadline release (ex: 10.1.8),
 * but the patch versions may differ between operating systems depending on the particulars of that release of Deadline.
 * This class provides a simple way to query a version of Deadline prior to or during deployment of a
 * CDK app.
 *
 * You pass an instance of this class to various Deadline constructs in this library to tell those
 * constructs which version of Deadline you want them to use, and be configured for.
 */
export class VersionQuery extends VersionQueryBase {
  /**
   * Parses a version string of the format:
   *
   *    <major>.<minor>.<release>.<patch>
   *
   * and extracts the components.
   *
   * @param versionstr The input version string
   */
  public static parseVersionString(versionstr: string): IPatchVersion {
    const match = VersionQuery.RE_FULL_VERSION.exec(versionstr);
    if (!match) {
      throw new Error(`"${versionstr}" is not a valid version`);
    }

    return {
      majorVersion: parseInt(match.groups!.major, 10),
      minorVersion: parseInt(match.groups!.minor, 10),
      releaseVersion: parseInt(match.groups!.release, 10),
      patchVersion: parseInt(match.groups!.patch, 10),
    };
  }

  /**
   * Specify a Deadline version from a fully-qualified Deadline patch version.
   *
   * This only provides the Linux repository installer based on its conventional
   * S3 object path.
   *
   * @remark Thinkbox reserves the right to revoke patch versions of Deadline and suceeed them with a new patch version.
   * For this reason, using this method may fail if Thinkbox revokes the specific patch version of the Deadline
   * installer in the event of a critical issue such as a security vulnerability.
   *
   * Use at your own risk.
   *
   * @param scope The parent scope
   * @param id The construct ID
   * @param versionComponents The individual components of the Deadline release version
   */
  public static exact(scope: Construct, id: string, versionComponents: IPatchVersion): IVersion {
    class ExactVersion extends VersionQueryBase {
      /**
       * @inheritdoc
       */
      public readonly majorVersion: number;

      /**
       * @inheritdoc
       */
      public readonly minorVersion: number;

      /**
       * @inheritdoc
       */
      public readonly releaseVersion: number;

      /**
       * @inheritdoc
       */
      public readonly linuxInstallers?: PlatformInstallers;

      constructor() {
        super(scope, id);
        const installerBucket = Bucket.fromBucketName(this, 'ThinkboxInstallers', ExactVersion.INSTALLER_BUCKET);

        const { majorVersion, minorVersion, releaseVersion, patchVersion } = versionComponents;

        this.majorVersion = majorVersion;
        this.minorVersion = minorVersion;
        this.releaseVersion = releaseVersion;

        const fullVersionString = this.fullVersionString(patchVersion);
        const objectKey = `Deadline/${fullVersionString}/Linux/DeadlineRepository-${fullVersionString}-linux-x64-installer.run`;

        this.linuxInstallers = {
          patchVersion,
          repository: {
            s3Bucket: installerBucket,
            objectKey,
          },
        };
      }
    }

    return new ExactVersion();
  }

  /**
   * Specify Version from a fully-qualified Deadline release version string.
   *
   * This only provides the Linux repository installer based on its conventional
   * S3 object path.
   *
   * @param scope The parent scope
   * @param id The construct ID
   * @param versionString A fully qualified version string (e.g. 10.1.9.2)
   */
  public static exactString(scope: Construct, id: string, versionString: string) {
    return VersionQuery.exact(scope, id, VersionQuery.parseVersionString(versionString));
  }

  /**
   * Regular expression for matching a Deadline release version number
   */
  private static readonly RE_FULL_VERSION = /^(?<major>\d+)\.(?<minor>\d+)\.(?<release>\d+)\.(?<patch>\d+)$/;

  /**
   * @inheritdoc
   */
  public readonly majorVersion: number;

  /**
   * @inheritdoc
   */
  public readonly minorVersion: number;

  /**
   * @inheritdoc
   */
  public readonly releaseVersion: number;

  /**
   * @inheritdoc
   */
  public readonly linuxInstallers?: PlatformInstallers;

  constructor(scope: Construct, id: string, props?: VersionQueryProps) {
    super(scope, id);
    throw new Error(`MethodNotSupportedException: This method is currently not implemented. Input: ${JSON.stringify(props)}`);
  }
}
