interface ReadPreferenceOptions {
  /** Max secondary read staleness in seconds, Minimum value is 90 seconds. */
  maxStalenessSeconds?: number;
}

/**
 * The **ReadPreference** class is a class that represents a MongoDB ReadPreference and is
 * used to construct connections.
 *
 * @param mode A string describing the read preference mode (primary|primaryPreferred|secondary|secondaryPreferred|nearest)
 * @param tags A tag set used to target reads to members with the specified tag(s). tagSet is not available if using read preference mode primary.
 * @param options Additional read preference options
 * @param options.maxStalenessSeconds
 * @see https://docs.mongodb.com/manual/core/read-preference/
 */
class ReadPreference {
  public static PRIMARY: string = 'primary';
  public static PRIMARY_PREFERRED: string = 'primaryPreferred';
  public static SECONDARY: string = 'secondary';
  public static SECONDARY_PREFERRED: string = 'secondaryPreferred';
  public static NEAREST: string = 'nearest';

  public static primary = new ReadPreference(ReadPreference.PRIMARY);
  public static primaryPreferred = new ReadPreference(ReadPreference.PRIMARY_PREFERRED);
  public static secondary = new ReadPreference(ReadPreference.SECONDARY);
  public static secondaryPreferred = new ReadPreference(ReadPreference.SECONDARY_PREFERRED);
  public static nearest = new ReadPreference(ReadPreference.NEAREST);

  mode: string;
  tags?: object[];
  maxStalenessSeconds?: number;
  minWireVersion?: number;

  constructor(mode: string, tags?: object[], options: ReadPreferenceOptions = {}) {
    if (!ReadPreference.isValid(mode)) {
      throw new TypeError(`Invalid read preference mode ${mode}`);
    }

    if (options === undefined && typeof tags === 'object' && !Array.isArray(tags)) {
      options = tags;
      tags = undefined;
    } else if (tags && !Array.isArray(tags)) {
      throw new TypeError('ReadPreference tags must be an array');
    }

    this.mode = mode;
    this.tags = tags;
    this.maxStalenessSeconds = undefined;

    if (options.maxStalenessSeconds != null) {
      if (options.maxStalenessSeconds <= 0) {
        throw new TypeError('maxStalenessSeconds must be a positive integer');
      }

      this.maxStalenessSeconds = options.maxStalenessSeconds;

      // NOTE: The minimum required wire version is 5 for this read preference. If the existing
      //       topology has a lower value then a MongoError will be thrown during server selection.
      this.minWireVersion = 5;
    }

    if (this.mode === ReadPreference.PRIMARY) {
      if (this.tags && Array.isArray(this.tags) && this.tags.length > 0) {
        throw new TypeError('Primary read preference cannot be combined with tags');
      }

      if (this.maxStalenessSeconds) {
        throw new TypeError('Primary read preference cannot be combined with maxStalenessSeconds');
      }
    }
  }

  /**
   * Construct a ReadPreference given an options object.
   *
   * @param {object} options The options object from which to extract the read preference.
   * @returns {ReadPreference}
   */
  static fromOptions(options: any): ReadPreference | null {
    const readPreference = options.readPreference;
    const readPreferenceTags = options.readPreferenceTags;

    if (readPreference == null) {
      return null;
    }

    if (typeof readPreference === 'string') {
      return new ReadPreference(readPreference, readPreferenceTags);
    } else if (!(readPreference instanceof ReadPreference) && typeof readPreference === 'object') {
      const mode = readPreference.mode || readPreference.preference;
      if (mode && typeof mode === 'string') {
        return new ReadPreference(mode, readPreference.tags, {
          maxStalenessSeconds: readPreference.maxStalenessSeconds
        });
      }
    }

    return readPreference;
  }

  /**
   * Validate if a mode is legal
   *
   * @function
   * @param {string} mode The string representing the read preference mode.
   * @returns {boolean} True if a mode is valid
   */
  static isValid(mode: string): boolean {
    return VALID_MODES.has(mode);
  }

  // Support the deprecated `preference` property introduced in the porcelain layer
  get preference() {
    return this.mode;
  }

  /**
   * Indicates that this readPreference needs the "slaveOk" bit when sent over the wire
   *
   * @function
   * @returns {boolean}
   * @see https://docs.mongodb.com/manual/reference/mongodb-wire-protocol/#op-query
   */
  slaveOk(): boolean {
    return NEEDS_SLAVEOK.has(this.mode);
  }

  /**
   * Are the two read preference equal
   *
   * @function
   * @param {ReadPreference} readPreference The read preference with which to check equality
   * @returns {boolean} True if the two ReadPreferences are equivalent
   */
  equals(readPreference: ReadPreference): boolean {
    return readPreference.mode === this.mode;
  }

  /**
   * Return JSON representation
   *
   * @function
   * @returns {object} A JSON representation of the ReadPreference
   */
  toJSON(): object {
    const readPreference = {
      mode: this.mode,
      tags: Array.isArray(this.tags) ? this.tags : undefined,
      maxStalenessSeconds: this.maxStalenessSeconds ? this.maxStalenessSeconds : undefined
    };
    return readPreference;
  }
}

const VALID_MODES = new Set([
  ReadPreference.PRIMARY,
  ReadPreference.PRIMARY_PREFERRED,
  ReadPreference.SECONDARY,
  ReadPreference.SECONDARY_PREFERRED,
  ReadPreference.NEAREST,
  (null as unknown) as string
]);

const NEEDS_SLAVEOK = new Set([
  ReadPreference.PRIMARY_PREFERRED,
  ReadPreference.SECONDARY,
  ReadPreference.SECONDARY_PREFERRED,
  ReadPreference.NEAREST,
]);

module.exports = ReadPreference;
