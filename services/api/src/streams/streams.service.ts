import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stream, StreamDocument } from './schemas/stream.schema';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';

@Injectable()
export class StreamsService {
  constructor(
    @InjectModel(Stream.name) private streamModel: Model<StreamDocument>,
  ) {}

  async create(createStreamDto: CreateStreamDto): Promise<Stream> {
    const streamKey = this.generateStreamKey();
    const createdStream = new this.streamModel({
      ...createStreamDto,
      streamKey,
      hlsUrl: `http://localhost:8080/hls/${streamKey}.m3u8`,
    });

    return createdStream.save();
  }

  async findAll(): Promise<Stream[]> {
    return this.streamModel.find().populate('userId', 'username avatar').exec();
  }

  async findActive(): Promise<Stream[]> {
    return this.streamModel
      .find({ status: 'active', isLive: true })
      .populate('userId', 'username avatar')
      .sort({ viewerCount: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Stream> {
    const stream = await this.streamModel
      .findById(id)
      .populate('userId', 'username avatar')
      .exec();
    
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }
    
    return stream;
  }

  async findByStreamKey(streamKey: string): Promise<Stream> {
    const stream = await this.streamModel
      .findOne({ streamKey })
      .populate('userId', 'username avatar')
      .exec();
    
    if (!stream) {
      throw new NotFoundException('Stream not found');
    }
    
    return stream;
  }

  async update(id: string, updateStreamDto: UpdateStreamDto): Promise<Stream> {
    const updatedStream = await this.streamModel
      .findByIdAndUpdate(id, updateStreamDto, { new: true })
      .populate('userId', 'username avatar')
      .exec();

    if (!updatedStream) {
      throw new NotFoundException('Stream not found');
    }

    return updatedStream;
  }

  async updateViewerCount(id: string, count: number): Promise<Stream> {
    return this.streamModel
      .findByIdAndUpdate(id, { viewerCount: count }, { new: true })
      .exec();
  }

  async updateLikeCount(id: string, count: number): Promise<Stream> {
    return this.streamModel
      .findByIdAndUpdate(id, { likeCount: count }, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.streamModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Stream not found');
    }
  }

  private generateStreamKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
