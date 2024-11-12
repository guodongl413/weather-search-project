import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, catchError, map, tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { WeatherDisplayComponent } from '../weather-display/weather-display.component'; // 确保路径正确

@Component({
  selector: 'app-search-form',
  standalone: true,
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatCheckboxModule,
    MatSelectModule,
    MatButtonModule,
    WeatherDisplayComponent
  ]
})
export class SearchFormComponent implements OnInit {
  searchForm: FormGroup;
  isLoading: boolean = false;
  dailyWeatherData: any; // 用于存储 daily 数据
  hourlyWeatherData: any; // 用于存储 hourly 数据

  cityOptions: { city: string; state: string }[] = [];
  states: string[] = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
    'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  private readonly API_BASE_URL = 'http://localhost:3000/api';

  // Flags for loading and error handling
  autocompleteError: boolean = false;
  locationError: boolean = false;

  // 用户位置信息
  userLatitude: number | null = null;
  userLongitude: number | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.searchForm = this.fb.group({
      street: [{ value: '', disabled: false }, Validators.required],
      city: [{ value: '', disabled: false }, Validators.required],
      state: [{ value: '', disabled: false }, Validators.required],
      useCurrentLocation: [false] // 添加复选框控制
    });
  }

  ngOnInit() {
    // 订阅 'city' 字段的值变化
    this.searchForm.get('city')?.valueChanges
      .pipe(
        debounceTime(300),
        switchMap(input => this.getCityAutocomplete(input || ''))
      )
      .subscribe((options) => {
        this.cityOptions = options || [];
      });

    // 订阅 'useCurrentLocation' 字段的值变化
    this.searchForm.get('useCurrentLocation')?.valueChanges
      .subscribe((checked: boolean) => {
        this.onLocationToggle(checked);
      });
  }

  /**
   * 自定义验证器，检查输入是否仅包含空格
   */
  noWhitespaceValidator(control: AbstractControl) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  /**
   * 检查表单字段是否无效且已被触碰
   */
  isFieldInvalid(field: string): boolean {
    const control = this.searchForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * 确定是否启用搜索按钮
   */
  isSearchButtonEnabled(): boolean {
    if (this.searchForm.get('useCurrentLocation')?.value) {
      return this.userLatitude !== null && this.userLongitude !== null && !this.locationError;
    } else {
      return this.searchForm.valid;
    }
  }

  /**
   * 处理 'Use Current Location' 复选框的切换
   */
  onLocationToggle(checked: boolean) {
    if (checked) {
      // 禁用表单字段但保留其值
      this.searchForm.get('street')?.disable();
      this.searchForm.get('city')?.disable();
      this.searchForm.get('state')?.disable();

      // 获取用户当前位置
      this.getUserLocation();
    } else {
      // 启用表单字段
      this.searchForm.get('street')?.enable();
      this.searchForm.get('city')?.enable();
      this.searchForm.get('state')?.enable();

      // 重置位置信息
      this.userLatitude = null;
      this.userLongitude = null;
      this.locationError = false;
    }
  }

  /**
   * 使用 ipinfo API 获取用户当前的经纬度
   */
  getUserLocation() {
    this.isLoading = true;
    this.locationError = false;

    this.http.get<any>('http://ip-api.com/json').pipe(
      catchError((error) => {
        console.error('Error fetching user location:', error);
        this.locationError = true;
        this.isLoading = false;
        return of(null);
      })
    ).subscribe((data) => {
      this.isLoading = false;
      if (data && data.status === 'success') {
        this.userLatitude = data.lat;
        this.userLongitude = data.lon;
      } else {
        this.locationError = true;
      }
    });
  }

  /**
   * 获取城市自动完成建议
   */
  getCityAutocomplete(input: string): Observable<{ city: string; state: string }[]> {
    if (!input) return of([]);
    const url = `/api/autocomplete?input=${input}`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        if (!response.predictions) return [];
        return response.predictions.map((prediction: any) => {
          const terms = prediction.terms;
          const city = terms[0]?.value;
          const state = terms[1]?.value;
          return { city, state };
        });
      }),
      catchError(() => {
        this.autocompleteError = true;
        return of([]);
      })
    );
  }

  /**
   * 处理从自动完成选中的城市
   */
  onCitySelected(option: { city: string; state: string }) {
    this.searchForm.get('city')?.setValue(option.city);
    this.searchForm.get('state')?.setValue(option.state);
  }

  /**
   * 处理表单提交
   */
  onSearch() {
    if (!this.isSearchButtonEnabled()) {
      // 标记所有字段为已触碰以触发验证消息
      this.searchForm.markAllAsTouched();
      return;
    }

    const formData = this.searchForm.getRawValue(); // 获取禁用字段的值

    this.isLoading = true;

    if (formData.useCurrentLocation) {
      // 使用当前位置信息发送请求
      const payload = {
        useCurrentLocation: true,
        latitude: this.userLatitude,
        longitude: this.userLongitude
      };
      this.sendSearchRequest(payload);
    } else {
      // 使用用户输入的地址发送请求
      const payload = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        useCurrentLocation: false
      };
      this.sendSearchRequest(payload);
    }
  }

  /**
   * 发送搜索请求到后端
   */
  // sendSearchRequest(payload: any) {
  //   this.http.post<any>(`${this.API_BASE_URL}/search`, payload).pipe(
  //     catchError((error) => {
  //       console.error('Search request failed:', error);
  //       this.isLoading = false;
  //       return of(null);
  //     })
  //   ).subscribe((response) => {
  //     this.isLoading = false;
  //     if (response) {
  //       console.log('Search response:', response);
  //       // 存储后端返回的数据
  //       this.dailyWeatherData = response.daily;
  //       this.hourlyWeatherData = response.hourly;
  //     } else {
  //       console.error('No response received from search API.');
  //     }
  //   });
  // }

  sendSearchRequest(payload: any) {
    this.http.post<any>(`${this.API_BASE_URL}/search`, payload).pipe(
      catchError((error) => {
        console.error('Search request failed:', error);
        this.isLoading = false;
        return of(null);
      })
    ).subscribe((response) => {
      this.isLoading = false;
      if (response) {
        console.log('Search response:', response);
        // 确保提取 daily 和 hourly 数据中的 intervals
        this.dailyWeatherData = response.daily?.data?.timelines[0]?.intervals || [];
        this.hourlyWeatherData = response.hourly?.data?.timelines[0]?.intervals || [];
        console.log('Daily Data:', this.dailyWeatherData);
        console.log('Hourly Data:', this.hourlyWeatherData);
      } else {
        console.error('No response received from search API.');
      }
    });
  }
  

  /**
   * 处理表单清除
   */
  onClear() {
    this.searchForm.reset({
      street: '',
      city: '',
      state: '',
      useCurrentLocation: false
    });

    // 启用表单字段
    this.searchForm.get('street')?.enable();
    this.searchForm.get('city')?.enable();
    this.searchForm.get('state')?.enable();

    // 重置位置信息
    this.userLatitude = null;
    this.userLongitude = null;
    this.locationError = false;

    // 重置错误标志
    this.autocompleteError = false;
  }
}
