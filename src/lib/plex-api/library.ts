import { PlexAPI } from './index';
import { PlexLibrarySection } from './types';

export class PlexLibrary {
  constructor(
    private api: PlexAPI,
    private section: PlexLibrarySection
  ) {}

  get id() { return this.section.id; }
  get title() { return this.section.title; }
  get type() { return this.section.type; }
  get key() { return this.section.key; }
  get agent() { return this.section.agent; }
  get scanner() { return this.section.scanner; }
  get uuid() { return this.section.uuid; }

  async refresh(): Promise<void> {
    await this.api.refreshLibrary(this.id);
  }

  toString(): string {
    return `PlexLibrary(${this.title}, type=${this.type}, id=${this.id})`;
  }
}